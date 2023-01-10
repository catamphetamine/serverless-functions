import path from 'path'

// https://ru.stackoverflow.com/questions/1281148/referenceerror-dirname-is-not-defined
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { setDirname } from './modules/dirname.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

setDirname(path.join(__dirname, 'modules'))

export { default as run } from './modules/run/run.js'