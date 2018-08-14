import path from 'path'
import fs from 'fs'

import babelCompile, { shouldIgnore } from './babel'

export default function installTransformHook(functions, transform) {
	const oldHook = require.extensions['.js']
	require.extensions['.js'] = function (m, filename) {
    if (shouldIgnore(filename)) {
      return oldHook(m, filename)
    }
		let code = fs.readFileSync(filename, 'utf-8')
		for (const func of functions) {
			if (path.join(`${func.directory}`, 'index.js') === filename) {
				code = transform(code)
				break
			}
		}
		return m._compile(babelCompile(code, filename), filename)
	}
}
