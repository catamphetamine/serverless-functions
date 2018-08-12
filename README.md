A toolkit for writing, testing, running and deploying serverless functions (e.g. AWS Lambda).

## Use

Go to Amazon IAM Management Console (`Services` -> `IAM`).

Create a new role for the "API Gateway" service called `apigateway-invoke-lambda` (for calling Lambdas from API Gateway) and attach the following JSON policy to it:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "lambda:InvokeFunction",
    "Resource": "*"
  }]
}
```

Create a new role for running Lambdas and attach an appropriate policy to it (e.g. `AWSLambdaFullAccess`).

Create a new role for deploying Lambdas and attach the following JSON policy to it:

```json

{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "lambda:GetAlias",
      "lambda:CreateAlias",
      "lambda:CreateFunction",
      "lambda:DeleteAlias",
      "lambda:DeleteFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:UpdateAlias",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "iam:PassRole",
      "apigateway:PUT",
      "apigateway:POST"
    ],
    "Resource": ["*"]
  }]
}
```

Create a new user for deploying Lambdas, add the Lambda deployment role to this user, and create an access key for this user.

Create a new project for lambda functions.

Create a `.babelrc` file in it:

```
{
  "presets": [
    ["env", {
      "targets": {
        "node": "8.10"
      }
    }]
  ],
  "plugins": [
    "transform-object-rest-spread",
    "transform-class-properties"
  ]
}
```

Create a `serverless.json` file in it:

```json
{
  "name": "project-name",
  "aws": {
    "accessKeyId": "USER-FOR-DEPLOYING-LAMBDAS-ACCESS-KEY-ID",
    "secretAccessKey": "hAx0rDaRkNeThAx0rDaRkNeThAx0rDaRkNeT",
    "apiId": "AWS-API-GATEWAY-API-ID",
    "region": "us-east-1",
    "runtime": "nodejs8.10",
    "role": "arn:aws:iam::1234567890:role/for-running-lambdas"
  }
}
```

If no AWS API Gateway API exists yet then don't add `aws.apiId` parameter yet — it will be created later.

To create a function create a directory anywhere inside the project directory and put `index.js` and `function.json` files in that directory.

`function.json` is the description of the function, i.e. its name, which URL does it respond on, to which HTTP method, etc.

```json
{
  "name": "function-name",
  "path": "/function/url/{parameterName}",
  "method": "GET"
}
```

`index.js` is the function code:

```js
export default async function({ path, body, query, event }) {
  return `The URL parameter is ${path.parameterName}`
}
```

Install `serverless-functions` package:

<!-- babel-polyfill babel-plugin-transform-object-rest-spread  -->

```
npm install serverless-functions --save
```

Add new `script`s to `package.json`:

```json
{
  "scripts": {
    "deploy": "serverless deploy dev",
    "update-routes": "serverless update-routes dev",
    "create-api": "serverless create-api"
  }
}
```

If no AWS API Gateway API exists yet then create it:

```
npm run create-api dev
```

Where `dev` is the name of the new "stage". It is common to create several "stages": `dev` for development, `prod` for production, `test` for testing the code in QA before rolling it out to `prod`. Additional stages can be created in AWS API Gateway dashboard.

The `create-api` command outputs the new API id: add it as the `aws.apiId` parameter to `serverless.json`.

Deploy the function on the `dev` stage:

```
npm run deploy <function-name>
```

Deploy the AWS API Gateway routing configuration for the new function on `dev` stage. This is only needed the first time the function is created, or when its `"path"` or `"method"` change:

```
npm run update-routes
```

Go to `https://AWS-API-GATEWAY-API-ID.execute-api.REGION.amazonaws.com/STAGE-NAME/FUNCTION-URL-PATH` and see the function response.

## Input

The function receives named parameters:

  * `event` — Lambda event.
  * `path` — (alias) URL path parameters.
  * `query` — (alias) URL query parameters.
  * `body` — (alias) HTTP request body.

## Output

The function can return anything. If it doesn't return anything then an empty object is assumed (in order for the HTTP response to be a valid JSON).

## Errors

To return an error from a function one can throw an instance of `Error` with an optional `httpStatusCode` property. The HTTP Response status code is gonna be the value of the `httpStatusCode` property (or `500`) and the HTTP Response JSON object is gonna contain `errorMessage` and `statusCode` properties.

```js
export default async function() {
  throw new Error('Test')
}
```

```js
import { Unauthorized } from 'serverless-functions/errors'

export default async function() {
  // Throws a 403 Forbidden error.
  throw new Unauthorized('You are not authorized to perform this action')
}
```