// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html
import AWSLambda from 'aws-sdk/clients/lambda.js'

import { validateIAMRole } from './utility.js'
import deploy, { deployFunction } from '../deploy/deploy.js'

export default async function deployLambdas(functionNames, stage, config, options) {
  return deploy(functionNames, stage, config, {
    ...options,
    generateCodeParameters: {
      region: config.aws.region
    }
  }, deployLambda)
}

async function deployLambda(func, zipFile, stage, config) {
  const functionName = `${config.name}-${func.name}`

  const Lambda = new AWSLambda({
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  })

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
    Runtime: config.aws.runtime
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