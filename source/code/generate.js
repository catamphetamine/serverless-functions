import path from 'path'
import fs from 'fs'

import { getDirname } from '../dirname.js'

import { RESERVED_FUNCTION_DESCRIPTION_PROPERTIES } from '../validate.js'
// import { tab, untab } from './tab.js'

const RELATIVE_IMPORT_REG_EXP = `(import [\\S]+ from ['"]{1})(\\.\\.?/[^'"]+)(['"]{1})`

const CODE_PIECES = [
	'initialize',
	'catchUnhandledErrors',
	'onCall',
	'createFunctionParameters',
	'onReturn',
	'createResponse',
	'headers',
	'onError',
	'createErrorResponse',
	'finally'
]

export default function({ path: functionFilePath, code, func, stage, local, region, cwd }, config) {
	const codePieces = {}

	for (const codePieceName of CODE_PIECES) {
		codePieces[codePieceName] = fs.readFileSync(
			config.code[codePieceName]
			?
			path.resolve(cwd || process.cwd(), config.code[codePieceName])
			:
			path.resolve(getDirname(), `./code/pieces/${codePieceName}.js`)
		,
		'utf-8')

		// Rebase relative `import` paths (for `run-locally` only)
		// to become relative to the project's root directory.
		if (config.code[codePieceName]) {
			codePieces[codePieceName] = codePieces[codePieceName].replace(
				new RegExp(RELATIVE_IMPORT_REG_EXP, 'g'),
				(match, p1, p2, p3) => {
					return p1 + elevateRelativePath(p2, path.relative(cwd || process.cwd(), functionFilePath)) + p3
				}
			)
		}
	}

	const template = fs.readFileSync(path.resolve(getDirname(), './code/template.js'), 'utf-8')

	func = { ...func }
	for (const property of RESERVED_FUNCTION_DESCRIPTION_PROPERTIES) {
		delete func[property]
	}

	return `
// Using "source-map-support" results in AWS Lambda initialization-time errors
// having no error message or stack trace.
// Example: "module initialization error: Error".
// https://github.com/evanw/node-source-map-support/issues/240
// // Source maps for error call stacks.
// import 'source-map-support/register'

// "@babel/polyfill" is included as a separate Webpack "entry point" instead.
// This is because babel polyfill must be "import"ed first
// and "import"s aren't executed in the order they're specified.
// Could be "require()"s instead but it's kinda old-fashioned.
// require('@babel/polyfill')

// No webpack in "local" mode so including Babel polyfill manually here.
${ local ? 'import "@babel/polyfill"' : '' }

${ code ? code.replace('export default', 'const $handler = ') : 'import $handler from "."'}

${CODE_PIECES.map(_ => codePieces[_]).join(';\n\n')}

const STAGE = ${JSON.stringify(stage)}
const FUNCTION = JSON.parse(${JSON.stringify(JSON.stringify(func))})
const LOCAL = ${JSON.stringify(local)}
${region ? 'const REGION = ' + JSON.stringify(region) : ''}

// Without "global" these constants wouldn't be accessible inside functions.
// Most likely due to Webpack wrapping modules in closures.
global.STAGE = STAGE
global.FUNCTION = FUNCTION
global.LOCAL = LOCAL
${region ? 'global.REGION = REGION' : ''}

// Default CORS HTTP headers.
// Can be overwritten inside "$initialize()".
let CORS_HEADERS = {
	// Required for CORS support to work.
	'Access-Control-Allow-Origin' : '*',
	// Required for cookies, authorization headers with HTTPS.
	'Access-Control-Allow-Credentials' : true
}

$initialize()

${template}
`
}

function countOccurences(string, char) {
	let n = 0
	let i = 0
	while (i < string.length) {
		if (string[i] === char) {
			n++
		}
		i++
	}
	return n
}

function elevateRelativePath(string, depthPath) {
	// Can be './a/b/c.js' (Linux) or 'a\b\c.js' (Windows).
	if (depthPath.indexOf('./') === 0) {
		depthPath = depthPath.slice('./'.length)
	}
	const depth = countOccurences(depthPath, path.sep)
	if (depth === 0) {
		return string
	}
	if (string.indexOf('./') === 0) {
		string = string.slice('./'.length)
	}
	return '../'.repeat(depth) + string
}