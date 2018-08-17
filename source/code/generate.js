import path from 'path'
import fs from 'fs'

import { RESERVED_FUNCTION_DESCRIPTION_PROPERTIES } from '../validate'
// import { tab, untab } from './tab'

const CODE_PIECES = [
	'initialize',
	'onCall',
	'createFunctionParameters',
	'onReturn',
	'createResponse',
	'onError',
	'createErrorResponse',
	'finally'
]

export default function({ path: functionFilePath, code, func, stage }, config) {
	const codePieces = {}

	for (const codePieceName of CODE_PIECES) {
		codePieces[codePieceName] = fs.readFileSync(
			config.code[codePieceName]
			?
			path.resolve(process.cwd(), config.code[codePieceName])
			:
			path.resolve(__dirname, `./pieces/${codePieceName}.js`)
		,
		'utf-8')
	}

	const template = fs.readFileSync(path.resolve(__dirname, './template.js'), 'utf-8')

	func = { ...func }
	for (const property of RESERVED_FUNCTION_DESCRIPTION_PROPERTIES) {
		delete func[property]
	}

	return `
// Source maps for error call stacks.
import 'source-map-support/register'

// "babel-polyfill" is included as a separate Webpack "entry point" instead.
// I guess there's no real difference about how to include it.
// Could be a simple "import".
// import 'babel-polyfill'

${ functionFilePath ? 'import $handler from ' + JSON.stringify(functionFilePath) : code.replace('export default', 'const $handler = ') }

${CODE_PIECES.map(_ => codePieces[_]).join(';\n\n')}

const STAGE = ${JSON.stringify(stage)}
const FUNCTION = JSON.parse(${JSON.stringify(JSON.stringify(func))})

// Without "global" these constants wouldn't be accessible inside functions.
// Most likely due to Webpack wrapping modules in closures.
global.STAGE = STAGE
global.FUNCTION = FUNCTION

const CORS_HEADERS = {
	// Required for CORS support to work.
	'Access-Control-Allow-Origin' : '*',
	// Required for cookies, authorization headers with HTTPS.
	'Access-Control-Allow-Credentials' : true
}

$initialize()

${template}
`
}