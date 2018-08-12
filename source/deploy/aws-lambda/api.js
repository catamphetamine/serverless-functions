// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/APIGateway.html
import APIGateway from 'aws-sdk/clients/apigateway'

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html
import IAM from 'aws-sdk/clients/iam'

import generateSwaggerSpecification from './swagger'
import { validateLambda } from './validate'
import findLambdas from './findLambdas'

export async function createApi(stage, config) {
  const apiGateway = new APIGateway({
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  })

  const lambdas = await findLambdas()

  // await createRoleIfNotExists(config);

  console.log(`Creating API`)
  console.log()

  // Import the new API into Amazon API Gateway.
  const result = await apiGateway.importRestApi({
    body: JSON.stringify(generateSwaggerSpec(stage, lambdas, config))
  }).promise()

  const apiId = result.id

  console.log()
  console.log(`The new API id is "${apiId}". Set it as the "aws.apiId" property of "serverless.json".`)

  // Deploy the API.
  if (stage)
  {
    console.log()
    console.log(`Deploying the API to stage "${stage}"`)

    await apiGateway.createDeployment({
      restApiId: apiId,
      stageName: stage
    }).promise()
  }

  return apiId
}

export async function updateApi(stage, config) {
  const apiGateway = new APIGateway({
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  })

  const lambdas = await findLambdas()

  // await createRoleIfNotExists(config);

  console.log(`Updating API "${config.aws.apiId}"`)
  console.log()

  await apiGateway.putRestApi({
    restApiId: config.aws.apiId,
    body: JSON.stringify(generateSwaggerSpec(stage, lambdas, config)),
    mode: 'overwrite' // 'merge'
  }).promise()

  // Deploy the updated API.
  if (stage)
  {
    console.log()
    console.log(`Deploying the API to stage "${stage}"`)

    await apiGateway.createDeployment({
      restApiId: config.aws.apiId,
      stageName: stage
    }).promise()
  }
}

function generateSwaggerSpec(stage, lambdas, config) {
  const routes = {}

  for (const lambda of lambdas) {
    validateLambda(lambda)
    // A lambda can be a scheduled job, not neccessarily an HTTP-called one.
    if (!lambda.path) {
      continue
    }
    routes[lambda.path] = (routes[lambda.path] || []).concat([{
      name: lambda.name,
      method: lambda.method || 'get',
      parameters: lambda.parameters || generateParametersFromPath(lambda.path)
    }])
  }

  for (const path of Object.keys(routes))
  {
    routes[path] = generateSwaggerSpecification
    (
      stage,
      routes[path],
      {
        projectName: config.name,
        role: config.aws.role,
        region: config.aws.region
      }
    )
  }

  return {
    swagger: '2.0',
    info: {
      version: '2017-04-20T04:08:08Z',
      title: config.name
    },
    // "host": "${config.aws.apiId}.execute-api.${config.aws.region}.amazonaws.com",
    // "basePath": `/${stage}`,
    schemes: [
      'https'
    ],
    definitions: {
      Empty: {
        type: 'object'
      }
    },
    paths: routes
  }
}

function generateParametersFromPath(path) {
  const parameters = path.match(/\{[^\}]+\}/g)
  if (!parameters) {
    return undefined
  }
  return parameters.map(_ => ({
    name: _.slice(1, _.length - 1),
    in: 'path', // 'query', 'header', 'body'
    required: true,
    type: 'string'
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-as-lambda-proxy-export-swagger-with-extensions.html
    // schema: {
    //   $ref: '#/definitions/Input'
    // }
  }));
}

// Automating role creation happened out to be insecure
// because in order for doing that the token would need
// "iam:GetRole" and "iam:CreateRole" permissions
// which would introduce an unnecessary security risk to the setup.
async function createRoleIfNotExists(config)
{
  const iam = new IAM({
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  })

  const role = 'apigateway-invoke-lambda'

  let exists = false
  try
  {
    await iam.getRole({
      RoleName: role
    }).promise()

    exists = true
  }
  catch (error)
  {
    if (error.code !== 'NoSuchEntity') {
      throw error
    }
  }

  if (!exists)
  {
    console.log(`Creating "${role}" role.`)
    console.log()

    const policy = await iam.createPolicy({
      PolicyName: role,
      Description: 'A policy for the API Gateway to invoke lambdas.',
      PolicyDocument: `{
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Action": "lambda:InvokeFunction",
          "Resource": "*"
        }]
      }`
    }).promise()

    await iam.createRole({
      RoleName: role,
      Description: 'A role for the API Gateway to invoke lambdas.',
      AssumeRolePolicyDocument: `{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
              "Service": "apigateway.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      }`
    }).promise()

    await iam.attachRolePolicy({
      PolicyArn: policy.Policy.Arn,
      RoleName: role
    }).promise()
  }
}