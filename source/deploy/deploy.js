import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import filesize from 'filesize'
import uuid from 'uuid'
import colors from 'colors/safe.js'
// import { ReadableStream } from 'memory-streams'

import Archive from './archive.js'
import bundle from './webpack.js'
import findFunctions from '../findFunctions.js'
import generateCode from '../code/generate.js'

export default async function deploy(functionNames, stage, config, options = {}, deploy) {
  const functions = await findFunctions(functionNames, options.cwd)

  for (const func of functions) {
    await deployFunction(func, stage, config, options, deploy)
  }
}

export async function deployFunction(func, stage, config, options, deploy) {
  console.log()
  console.log('-----------------------------------------------------')
  console.log(`Deploying ${colors.green(func.name)} to ${colors.yellow(stage)} stage.`)
  console.log('-----------------------------------------------------')
  console.log()

  // // Bundle the function using Webpack without outputting a file.
  // const compiledFunction = await bundle(`${func.directory}/index.js`, null, {
  //   ...
  // })

  const UUID = uuid.v4()
  const outputBasePath = path.resolve(os.tmpdir(), UUID)
  const handlerOutputPath = `${outputBasePath}.handler.js`
  const packageOutputPath = `${outputBasePath}.zip`
  // const functionOutputPath = `${outputBasePath}.js`
  // fs.copySync(`${func.directory}/index.js`, functionOutputPath)

  const handlerOutputPathLocal = path.resolve(func.directory, `index.${uuid.v4()}.js`)

  fs.writeFileSync(handlerOutputPathLocal, generateCode({
    cwd: options.cwd,
    func,
    stage,
    local: false,
    path: path.join(func.directory, 'index.js'),
    ...options.generateCodeParameters
  }, config))

  console.log('Compiling...')

  // Bundle the handler using Webpack.
  await bundle(handlerOutputPathLocal, handlerOutputPath)

  // Clean up.
  fs.unlinkSync(handlerOutputPathLocal)

  // Create a zip archive.
  console.log('Zipping...')

  const archive = new Archive(packageOutputPath)

  archive.file(handlerOutputPath, 'index.js')
  archive.file(`${handlerOutputPath}.map`, 'index.js.map')

  const { size } = await archive.write()

  // Clean up.
  // fs.unlinkSync(functionOutputPath)
  fs.unlinkSync(handlerOutputPath)
  fs.unlinkSync(`${handlerOutputPath}.map`)

  // Print `.zip` file size
  console.log(filesize(size, { round: 0 }))

  const zipFile = fs.readFileSync(packageOutputPath)
  // const zipFile = new ReadableStream(output)

  // Deploy the function.
  await deploy(func, zipFile, stage, config)

  // Clean up.
  fs.unlinkSync(packageOutputPath)
}