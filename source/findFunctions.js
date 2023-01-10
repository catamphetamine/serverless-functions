import fs from 'fs'
import path from 'path'

import { validateFunctionDescription } from './validate.js'

/**
 * Finds function descriptions by their names.
 * @param  {string[]} [functionNames] — The names of the functions to find. Pass `undefined` to find all functions.
 * @param  {string} directory – Root directory.
 * @return {object[]} Function descriptions, each "description" being the contents of `function.json` plus `directory: string` property (an absolute path). To get relative path to the function directory from the root directory one could do: `path.relative(directory, func.directory)`.
 */
export default async function findFunctions(functionNames, directory = process.cwd()) {
  const functions = await _findFunctions(functionNames && functionNames.slice(), directory)
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
 * Finds function descriptions by their names.
 * Walks the directory tree recursively.
 * @param  {string[]} [functionNames] — The names of the functions to find. Pass `undefined` to find all functions.
 * @param  {string} directory – Root directory.
 * @return {object[]} Function descriptions.
 */
function _findFunctions(functionNames, directory, options = {}) {
  return new Promise((resolve, reject) =>
  {
    if (functionNames && functionNames.length === 0) {
      return resolve([])
    }

    // if (options.ignore) {
    //   for (const ignore of options.ignore) {
    //     if (ignore.test(directory)) {
    //       return resolve([])
    //     }
    //   }
    // }

    fs.readdir(directory, (error, children) => {
      if (error) {
        return reject(error)
      }
      Promise.all(children.filter(_ => _ !== 'node_modules').map((child) => {
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
                  _findFunctions(functionNames, childPath, options).then(resolve)
                  return
                }
                const lambda = JSON.parse(contents)
                if (functionNames) {
                  const index = functionNames.indexOf(lambda.name)
                  if (index < 0) {
                    return resolve([])
                  }
                  functionNames.splice(index, 1)
                }
                validateFunctionDescription(lambda)
                lambda.directory = childPath
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