import { validateIAMRole, getAWSAccountId } from './utility'

// Swagger 2.0 specification generator.
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md

export default function(stage, methods, options) {
  return methods.reduce((routes, method) => ({
    ...routes,
    [method.method.toLowerCase()]: generateMethodSpecification(
      stage,
      method.name,
      method.parameters,
      options
    )
  }), {
    // Allow CORS for these HTTP request `methods`.
    //
    // Lambdas will use the proxy integration with API Gateway.
    // So lambda functions will inject CORS headers into the response
    // and those headers will be proxied to API Gateway.
    //
    // However for OPTIONS, there is no lambda function assigned for it
    // and so it can't rely on the proxy integration.
    // Instead, API Gateway has to include the CORS headers for the OPTIONS method
    // and that's why the OPTIONS method must be added manually
    // to the swagger document for each of the `methods`.
    //
    options: generateOptionsSpecification(methods.map(method => method.method.toUpperCase()))
  })
}

// Returns Swagger "Operation Object".
// (HTTP method description for an endpoint)
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#operationObject
function generateMethodSpecification(stage, functionName, parameters, { projectName, role, region, consumesContentTypes, producesContentTypes, requestTemplates, responseTemplates }) {
  validateIAMRole(role)
  const awsAccountId = getAWSAccountId(role)
  return {
    consumes: consumesContentTypes,
    produces: producesContentTypes || ['application/json'],
    parameters,
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
    'x-amazon-apigateway-integration': {
      credentials: `arn:aws:iam::${awsAccountId}:role/apigateway-invoke-lambda`,
      uri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${region}:${awsAccountId}:function:${projectName}-${functionName}:${stage}/invocations`,
      passthroughBehavior: 'when_no_match', // 'when_no_templates',
      httpMethod: 'POST',
      type: 'aws_proxy'
    }
  }
}

// Returns Swagger "Operation Object".
// (OPTIONS HTTP method description for an endpoint)
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#operationObject
function generateOptionsSpecification(methods) {
  return {
    responses: {
      '200': {
        description: '200 response',
        schema: {
          $ref: '#/definitions/Empty'
        },
        headers: {
          'Access-Control-Allow-Origin': {
            type: 'string'
          },
          'Access-Control-Allow-Methods': {
            type: 'string'
          },
          'Access-Control-Allow-Headers': {
            type: 'string'
          }
        }
      }
    },
    'x-amazon-apigateway-integration': {
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }'
      },
      passthroughBehavior: 'when_no_match',
      responses: {
        default: {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Methods': `'${methods.join(',')},OPTIONS'`,
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }
      },
      type: 'mock'
    }
  }
}
