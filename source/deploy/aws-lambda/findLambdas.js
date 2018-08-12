import fs from 'fs'
import path from 'path'

/**
 * (walks the subdirectory tree recursively).
 */
export default async function findLambdas(lambdaNames, directory = process.cwd(), options = {}) {
  const lambdas = await _findLambdas(lambdaNames && lambdaNames.slice(), directory, options)
  if (lambdaNames) {
    const foundLambdaNames = lambdas.map(_ => _.name)
    const notFoundLambdaNames = lambdaNames.filter(_ => foundLambdaNames.indexOf(_) < 0)
    if (notFoundLambdaNames.length > 0) {
      throw new Error(`The following lambdas were not found: ${notFoundLambdaNames.join(', ')}.`)
    }
  }
  return lambdas
}

/**
 * (walks the subdirectory tree recursively).
 */
function _findLambdas(lambdaNames, directory = process.cwd(), options = {}) {
  options.ignore = options.ignore || [ /node_modules/ ]

  return new Promise((resolve, reject) =>
  {
    if (lambdaNames && lambdaNames.length === 0) {
      return resolve([])
    }

    if (options.ignore) {
      for (const ignore of options.ignore) {
        if (ignore.test(directory)) {
          return resolve([])
        }
      }
    }

    fs.readdir(directory, (error, children) => {
      if (error) {
        return reject(error)
      }
      Promise.all(children.map((child) => {
        return new Promise((resolve, reject) => {
          const childPath = path.join(directory, child)
          fs.stat(childPath, (error, stats) => {
            if (error) {
              return reject(error)
            }
            if (stats.isDirectory()) {
              fs.readFile(path.join(childPath, 'function.json'), 'utf8', (error, contents) => {
                if (error) {
                  // If `function.json` doesn't exist then search recursively.
                  _findLambdas(lambdaNames, childPath).then(resolve)
                  return
                }
                const lambda = {
                  directory: childPath,
                  ...JSON.parse(contents)
                }
                if (lambdaNames) {
                  const index = lambdaNames.indexOf(lambda.name)
                  if (index < 0) {
                    return resolve([])
                  }
                  lambdaNames.splice(index, 1)
                }
                resolve([lambda])
              })
            } else if (stats.isFile()) {
              resolve([])
            }
          })
        })
      }))
      .then((foldersContents) => {
        resolve(foldersContents.reduce((all, folderContents) => all.concat(folderContents), []))
      })
    })
  })
}