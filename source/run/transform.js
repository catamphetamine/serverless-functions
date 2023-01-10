import path from 'path'
import fs from 'fs'

// import { addHook } from 'pirates'

import babelCompile, { initializeBabelOptions } from './babel.js'

export function initializeTransform(options) {
	initializeBabelOptions(options)
}

export default function transformCode(code, filename, transform, { functions }) {
	// If it's a serverless function then generate its code.
	for (const func of functions) {
		if (path.join(`${func.directory}`, 'index.js') === filename) {
			code = transform(code, filename)
			break
		}
	}
	// Transform code via Babel.
	try {
		return babelCompile(code, filename)
	} catch (error) {
		console.error(error)
		return `
			exports.handler = function(a, b, callback) {
				return callback(null, {
					statusCode: 500,
          body: ${JSON.stringify(JSON.stringify(error.message))}
				})
			}
		`
	}
}

// export function installTransformHook(functions, transform, options) {
// 	initializeBabelOptions(options)

// 	const revert = addHook(
// 		(code, filename) => {
// 			// If it's a serverless function then generate its code.
// 			for (const func of functions) {
// 				if (path.join(`${func.directory}`, 'index.js') === filename) {
// 					code = transform(code, filename)
// 					break
// 				}
// 			}
// 			// Transform code via Babel.
// 			try {
// 				return babelCompile(code, filename)
// 			} catch (error) {
// 				console.error(error)
// 				return `
// 					exports.handler = function(a, b, callback) {
// 						return callback(null, {
// 							statusCode: 500,
// 	            body: ${JSON.stringify(JSON.stringify(error.message))}
// 						})
// 					}
// 				`
// 			}
// 		},
// 		{
// 			exts: ['.js'],
// 			matcher: filename => true
// 		}
// 	)
// }