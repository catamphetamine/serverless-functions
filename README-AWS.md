## AWS Setup

Prerequisites: read the main [README](https://github.com/catamphetamine/serverless-functions/blob/master/README.md) first.

#### 1. Create role for API Gateway to run Lambdas.

* Go to Amazon IAM Management Console (`Services` -> `IAM`) and navigate to "Roles" tab. See [screenshot](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam.png?raw=true).

* Create a new role for the "API Gateway" service called `apigateway-invoke-lambda` which will be used for calling Lambdas from API Gateway. When done via GUI it must be created for "API Gateway" service explicitly in order to get the correct "Trust Relationships" (`Service: apigateway.amazonaws.com`). See screenshots: [1](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-roles.png?raw=true), [2](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-create-role.png?raw=true), [3](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-create-role-2.png?raw=true), [4](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-create-role-3.png?raw=true).

* Attach the JSON policy to this new `apigateway-invoke-lambda` role. See screenshots: [1](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-roles-role.png?raw=true), [2](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-role.png?raw=true), [3](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-role-create-policy.png?raw=true), [4](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-role-create-policy-2.png?raw=true), [5](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-role-create-policy-3.png?raw=true), [6](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-role-create-policy-4.png?raw=true), [7](https://github.com/catamphetamine/serverless-functions/blob/master/docs/images/aws/api-gateway/aws-iam-role-attach-policy.png?raw=true).

```js
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "lambda:InvokeFunction",
    "Resource": "*"
  }]
}
```

#### 2. Create role for Lambdas.

Create a new role for running Lambdas. When done via GUI it must be created for "API Gateway" service explicitly in order to get the correct "Trust Relationships" (`Service: lambda.amazonaws.com`). Attach an appropriate policy to this new role (e.g. `AWSLambdaFullAccess`).

#### 3. Create user for deploying Lambdas.

Create a new role for deploying Lambdas and attach the following JSON policy to it:

```js
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

#### 4. Set up the project.

Add an `aws` entry to the `serverless.json` file of a project:

```js
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

Add new `script`s to project's `package.json`:

```js
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

Functions receive the following additonal parameters:

  * `event` — AWS Lambda [event](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format).

  * `context` — AWS Lambda context.

## API

```js
import { createApi, updateRoutes, deploy } from 'serverless-functions/aws-lambda'
import config from './serverless.json'

await createApi(stage, config, { cwd: process.cwd() })
await updateRoutes(stage, config, { cwd: process.cwd() })
await deploy(functionNames, stage, config, { cwd: process.cwd() })
```