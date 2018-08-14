## AWS Setup

Prerequisites: read the main [README](https://github.com/catamphetamine/serverless-functions/blob/master/README.md) first.

Go to Amazon IAM Management Console (`Services` -> `IAM`).

Create a new role for the "API Gateway" service called `apigateway-invoke-lambda` which will be used for calling Lambdas from API Gateway. When done via GUI it must be created for "API Gateway" service explicitly in order to get the correct "Trust Relationships". Attach the following JSON policy to this new `apigateway-invoke-lambda` role:

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

Create a new role for running Lambdas and attach an appropriate policy to it (e.g. `AWSLambdaFullAccess`).

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

Create an `aws` entry in the `serverless.json` file of a project:

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