import fs from 'fs'
import path from 'path'

export default async function findFunctions(functionNames, directory = process.cwd(), options = {}) {
  const functions = await _findFunctions(functionNames && functionNames.slice(), directory, options)
  if (functionNames) {
    const foundFunctionNames = functions.map(_ => _.name)
    const notFoundFunctionNames = functionNames.filter(_ => foundFunctionNames.indexOf(_) < 0)
    if (notFoundFunctionNames.length > 0) {
      throw new Error(`The following functions were not found: ${notFoundFunctionNames.join(', ')}.`)
    }
  }
  return functions
}

/**
 * (walks the subdirectory tree recursively).
 */
function _findFunctions(functionNames, directory = process.cwd(), options = {}) {
  options.ignore = options.ignore || [ /node_modules/ ]

  return new Promise((resolve, reject) =>
  {
    if (functionNames && functionNames.length === 0) {
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
                  _findFunctions(functionNames, childPath).then(resolve)
                  return
                }
                const lambda = {
                  directory: childPath,
                  ...JSON.parse(contents)
                }
                if (functionNames) {
                  const index = functionNames.indexOf(lambda.name)
                  if (index < 0) {
                    return resolve([])
                  }
                  functionNames.splice(index, 1)
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