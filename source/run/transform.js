import path from 'path'
import fs from 'fs'

import babelCompile, { initializeBabelOptions } from './babel'

export default function installTransformHook(functions, transform, options) {
	initializeBabelOptions(options)
	const oldHook = require.extensions['.js']
	require.extensions['.js'] = function (m, filename) {
    // Read the contents of the file.
		let code = fs.readFileSync(filename, 'utf-8')
		// If it's a serverless function then generate its code.
		for (const func of functions) {
			if (path.join(`${func.directory}`, 'index.js') === filename) {
				code = transform(code, filename)
				break
			}
		}
		// Transform code via Babel.
		try {
			return m._compile(babelCompile(code, filename), filename)
		} catch (error) {
			console.error(error)
			return m._compile(`
				exports.handler = function(a, b, callback) {
					return callback(null, {
						statusCode: 500,
            body: ${JSON.stringify(JSON.stringify(error.message))}
					})
				}
			`, filename)
		}
	}
}