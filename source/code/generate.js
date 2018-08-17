import path from 'path'
import fs from 'fs'

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

export default function(handler, config) {
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

  return `
  	// Source maps for error call stacks.
    import 'source-map-support/register'

    // "babel-polyfill" is included as a separate Webpack "entry point" instead.
    // I guess there's no real difference about how to include it.
    // Could be a simple "import".
    // import 'babel-polyfill'

    ${ handler.path ? 'import $handler from ' + JSON.stringify(handler.path) : handler.code.replace('export default', 'const $handler = ') }

    ${CODE_PIECES.map(_ => codePieces[_]).join(';\n\n')}

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