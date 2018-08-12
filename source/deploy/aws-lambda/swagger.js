import { validateIAMRole, IAM_ROLE_REG_EXP } from './validate'

// See Swagger 2.0 specification
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md

// `methods` is a list of available HTTP methods for this endpoint.
//
// E.g. [{
//   method: 'post',
//   lambdaName: 'courseRequest-request'
// }]
//
// Returns an endpoint Swagger specification.
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#pathItemObject
//
// E.g. {
//   "post": {
//     "consumes": [
//       "application/json"
//     ],
//     "responses": {
//       "200": {
//         "description": "200 response"
//       }
//     },
//     "x-amazon-apigateway-integration": ...
//   }
// }
//
export default function(stage, methods, options) {
  const route = {}
  for (const method of methods)
  {
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
    // "/{proxy+}"
    // "x-amazon-apigateway-any-method"
    route[method.method.toLowerCase()] = generateMethodSpecification
    (
      stage,
      method.name,
      method.parameters,
      options
    )
  }
  // Allow CORS for these HTTP methods.
  route.options = generateOptionsSpecification(methods.map(method => method.method.toUpperCase()))
  return route
};

// Returns Swagger Operation Object
// (HTTP method description for an endpoint)
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#operationObject
function generateMethodSpecification(stage, lambdaName, parameters, { projectName, role, region, consumesContentTypes, producesContentTypes, requestTemplates, responseTemplates }) {
  validateIAMRole(role)
  const awsAccountId = role.match(IAM_ROLE_REG_EXP)[1]
  const definition = {
    consumes: consumesContentTypes,
    produces: producesContentTypes,
    // produces: ["application/json"],
    parameters,
    // responses: {},
    // responses: {
    //   '200': {
    //     description: '200 OK',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   },
    //   '401': {
    //     description: '401 Unauthorized',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   },
    //   '403': {
    //     description: '403 Forbidden',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   },
    //   '404': {
    //     description: '404 Not Found',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   },
    //   '408': {
    //     description: '408 Request Timeout',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   },
    //   '409': {
    //     description: '409 Conflict',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   },
    //   '422': {
    //     description: '422 Unprocessable Entity',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   },
    //   '500': {
    //     description: '500 Internal Server Error',
    //     headers: {
    //       'Access-Control-Allow-Origin': {
    //         type: 'string'
    //       }
    //     }
    //   }
    // },

    // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
    'x-amazon-apigateway-integration': {
      credentials: `arn:aws:iam::${awsAccountId}:role/apigateway-invoke-lambda`,
      // requestTemplates,
      // responseTemplates,
      uri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${region}:${awsAccountId}:function:${projectName}-${lambdaName}:${stage}/invocations`,
      passthroughBehavior: 'when_no_match',
      // passthroughBehavior: 'when_no_templates',
      // responses: {
      //   default: {
      //     statusCode: '200',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   '.*"code":401[,\}].*': {
      //     statusCode: '401',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   '.*"code":403[,\}].*': {
      //     statusCode: '403',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   '.*"code":404[,\}].*': {
      //     statusCode: '404',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   '.*"code":409[,\}].*': {
      //     statusCode: '409',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   '.*"code":422[,\}].*': {
      //     statusCode: '422',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   '.*"code":500[,\}].*': {
      //     statusCode: '500',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   // Does not work for some weird reason.
      //   // The regular expression is correct.
      //   // https://github.com/oseibonsu/JITUApp/issues/562
      //   '.* Task timed out after .*': {
      //     statusCode: '408',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   },
      //   // // For some reason this doesn't work: the response status is always 200.
      //   // // { "errorMessage" : "body size is too long"}
      //   // Don't know if this could work:
      //   'body size is too long': {
      //     statusCode: '500',
      //     responseParameters: {
      //       'method.response.header.Access-Control-Allow-Origin': "'*'"
      //     }
      //   }
      // },
      httpMethod: 'POST',
      type: 'aws_proxy'
    }
  }

  // // Specify all possible parameters
  // // i.e. those parameters which come in the URL itself.
  // if (parameters) {
  //   definition.parameters = parameters;
  // }

  return definition
}

// Returns Swagger Operation Object
// (OPTIONS HTTP method description for an endpoint)
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#operationObject
function generateOptionsSpecification(methods) {
  return {
    consumes: [
      'application/json'
    ],
    produces: [
      'application/json'
    ],
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
        'application/json': '{\"statusCode\": 200}'
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
  };
}
