import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import filesize from 'filesize'
import uuid from 'uuid'
import { ReadableStream } from 'memory-streams'
import colors from 'colors/safe'

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html
import AWSLambda from 'aws-sdk/clients/lambda'

import Archive from '../Archive'
import bundle from '../webpack'
import findFunctions from '../findFunctions'
import { validateIAMRole } from './utility'
import generateCode from '../code/generate'

export default async function deploy(functionNames, stage, config, options = {}) {
  const functions = await findFunctions(functionNames, options.cwd)

  for (const func of functions) {
    await deployFunction(func, stage, config, options)
  }
}

async function deployFunction(func, stage, config, options) {
  const Lambda = new AWSLambda({
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  })

  console.log()
  console.log('-----------------------------------------------------')
  console.log(`Deploying ${colors.green(func.name)} to ${colors.yellow(stage)} stage.`)
  console.log('-----------------------------------------------------')
  console.log()

  // // Bundle the function using Webpack.
  // const compiledFunction = await bundle(`${func.directory}/index.js`, null, {
  //   ...
  // })

  // fs.copySync(`${func.directory}/index.js`, functionOutputPath)

  // const compiledFunction = fs.readFileSync(functionOutputPath).toString()

  // const returnAuthenticationError = `
  //   if (error.name === 'TokenExpiredError') {
  //     return callback(JSON.stringify({
  //       code: 401,
  //       message: 'TokenExpiredError'
  //     }))
  //   }
  //   return callback(JSON.stringify({
  //     code: 401,
  //     message: 'AuthenticationError'
  //   }))
  // `

  // let lambdaHandlerGetUser = 'let user'
  // if (!lambdaDescription.public || lambdaDescription.semiPublic) {
  //   lambdaHandlerGetUser += `
  //     try {
  //       user = await lib.getUser${settings.getUserFromDatabase ? '' : 'Data'}FromToken(event)
  //     } catch(error) {
  //       ${lambdaDescription.passAuthenticationError ? 'user = error' : 'console.error(error)' + returnAuthenticationError}
  //     }
  //   `
  //   if (!lambdaDescription.semiPublic) {
  //     lambdaHandlerGetUser += 'if (!user) return callback(lib.http.code401)'
  //   }
  // }

  // const code =
  // {
  //   imports: '',
  //   before:
  //   `
  //     // Suspend the Node.js process immediately after response is sent.
  //     // Fixes Sequelize connection pool preventing Node.js process from terminating.
  //     context.callbackWaitsForEmptyEventLoop = false
  //   `
  //   after: '',
  //   onError:
  //   `
  //     // Notify devs by email about 5XX errors in production.
  //     if (event.stageVariables.reportErrors &&
  //       (!error.httpStatusCode || /5\\d\\d/.test(error.httpStatusCode))) {
  //       const errorNotificationText = \`\${context.functionName}\n\n\${error.stack}\n\nhttps://console.aws.amazon.com/cloudwatch/home?region=${config.aws.region}#logEventViewer:group=\${context.logGroupName}stream=\${context.logStreamName}\`
  //       await lib.publish('backend-devs-queue', 'AWS Lambda Error', errorNotificationText)
  //     }
  //   `,
  //   finally:
  //   `
  //     // // Fixes Sequelize connection pool preventing Node.js process from terminating.
  //     // // https://github.com/sequelize/sequelize/issues/8468#issuecomment-410451242
  //     // const pool = lib.sequelize.connectionManager.pool;
  //     // if (pool) {
  //     //   // After calling "pool.drain()" the pool seems to be unusable
  //     //   // so next time when the Lambda gets reused
  //     //   // (next request comes shortly after the previous one)
  //     //   // it throws "pool is draining and cannot accept work".
  //     //   // https://github.com/coopernurse/node-pool#draining
  //     //   await pool.drain();
  //     //   await pool.clear();
  //     // }
  //   `
  // }

  // import $handler from '${functionOutputPath}'

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
    path: '.'
  }, config))

  const runtime = config.aws.runtime || 'nodejs6.10'

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

  const functionName = `${config.name}-${func.name}`

  // If this lamda existed previously then update its code.
  let exists = false
  let codeSha256
  try {
    const data = await Lambda.getFunctionConfiguration({
      FunctionName: functionName
    }).promise()
    codeSha256 = data.CodeSha256
    exists = true
  } catch (error) {
    // The error means the lambda function doesn't exists.
    // Should check for `error.message` though.
    if (error.message.indexOf('Function not found:') !== 0) {
      throw error
    }
  }

  validateIAMRole(config.aws.role)

  const lambdaConfiguration = {
    FunctionName: functionName,
    Handler: 'index.handler',
    Role: config.aws.role,
    MemorySize: func.memory || 1536,
    Timeout: func.timeout || config.timeout || 15,
    Runtime: runtime
  }

  // Dead Letter Queue (DLQ) receives all events
  // which the lambda can't process after it has tried and re-tried.
  if (config.aws.dlq) {
    lambdaConfiguration.DeadLetterConfig = {
      TargetArn: config.aws.dlq
    }
  }

  // Environment variables.
  if (func.env || config.env) {
    lambdaConfiguration.Environment = {
      Variables: {
        ...config.env,
        ...func.env
      }
    }
  }

  // Tags for cost monitoring, etc.
  if (config.tags || func.tags) {
    lambdaConfiguration.Tags = {
      ...config.tags,
      ...func.tags
    }
  }

  if (exists) {
    console.log('Updating lambda function.')

    // Find out whether should update lambda code.
    const result = await Lambda.updateFunctionCode({
      FunctionName: functionName,
      ZipFile: zipFile,
      DryRun: true
    }).promise()

    // `result.CodeSha256` seems to be always different.
    // Most likely timestamps somewhere in the webpack-bundled code.
    if (result.CodeSha256 === codeSha256)
    {
      console.log('The function hasn\'t changed. Skipping.')
    }
    else
    {
      // Update lambda code.
      const result = await Lambda.updateFunctionCode({
        FunctionName: functionName,
        ZipFile: zipFile,
        Publish: true
      }).promise()

      // Update stage-specific function alias.
      await updateFunctionAlias(functionName, stage, result.Version, Lambda)
    }

    // Update lambda configuration
    console.log('Updating function settings.')
    await Lambda.updateFunctionConfiguration(lambdaConfiguration).promise()
  }
  else {
    console.log('Creating new lambda function.')

    const result = await Lambda.createFunction({
      Code: {
        ZipFile: zipFile
      },
      // Publish a version.
      // https://docs.aws.amazon.com/lambda/latest/dg/versioning-intro.html
      Publish: true,
      ...lambdaConfiguration
    }).promise()

    // Update stage-specific function alias.
    await updateFunctionAlias(functionName, stage, result.Version, Lambda)
  }

  // Clean up.
  fs.unlinkSync(packageOutputPath)
}

async function updateFunctionAlias(functionName, alias, version, Lambda)
{
  let currentVersion

  try
  {
    const result = await Lambda.getAlias({
      FunctionName: functionName,
      Name: alias
    }).promise()

    currentVersion = result.FunctionVersion
  }
  catch (error)
  {
    if (error.code !== 'ResourceNotFoundException') {
      throw error
    }
  }

  if (currentVersion)
  {
    console.log('Updating alias.')

    // Point the alias to the new function version.
    await Lambda.updateAlias({
      FunctionName: functionName,
      Name: alias,
      FunctionVersion: version
    }).promise()

    console.log('Deleting old function version.')

    // Delete old function version.
    await Lambda.deleteFunction({
      FunctionName: functionName,
      Qualifier: currentVersion
    })
  }
  else
  {
    console.log('Creating alias.')

    // Point the alias to the current function version.
    await Lambda.createAlias({
      FunctionName: functionName,
      Name: alias,
      FunctionVersion: version
    }).promise()
  }
}