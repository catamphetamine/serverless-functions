A toolkit for writing, testing, running and deploying serverless functions (e.g. AWS Lambda).

## Concepts

"Serverless" means splitting an API into a set of independent functions (API endpoints). Each function is a directory having a `function.json` description file and an `index.js` main code file (which can `import` any other code) which `exports default async function` which takes a `parameters` object (HTTP GET query parameters, HTTP POST body, etc) and returns a `response` which could be, for example, a JSON object.

## Use

Create a new project.

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

```js
{
  "name": "project-name"
}
```

To create a function create a directory anywhere inside the project directory and put `index.js` and `function.json` files in that directory.

`function.json` is the description of the function, i.e. its name, which URL does it respond on, to which HTTP method, etc.

```js
{
  "name": "function-name",
  "path": "/example-function/{parameterName}",
  "method": "GET"
}
```

`index.js` is the function code:

```js
export default async function({ path, body, query }) {
  return {
    pathParameter: path.parameterName
  }
}
```

Install `serverless-functions` package:

```
npm install serverless-functions --save
```

Add a new `script` to `package.json`:

```js
{
  "scripts": {
    "run-locally": "serverless run dev 8888"
  }
}
```

Run the functions locally:

```
npm run run-locally
```

Go to `http://localhost:8888/example-function/123`. It should respond with `{ pathParameter: 123 }`.

## Input

The function receives the following parameters:

  * `path` — URL path parameters.
  * `query` — URL query parameters.
  * `body` — HTTP request body.
  * `headers` — HTTP request headers.

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

## Streaming

Currently serverless functions seem to not support streaming HTTP request/response data. Use the old-school Node.js stuff for that (e.g. `express`).

## AWS Setup

See the [AWS Lambda guide](https://github.com/catamphetamine/serverless-functions/blob/master/README-AWS.md).

## Extending

One can customize the code template used for generating functions. The [template](https://github.com/catamphetamine/serverless-functions/tree/master/source/code/template.js) is:

```js
$initialize()
export async function handler(event, context, callback) {
  try {
    await $onCall(event, context)
    const parameters = $createFunctionParameters(event, context)
    let result = await $handler(parameters)
    result = (await $onReturn(result)) || result
    callback(null, $createResponse(result))
  } catch (error) {
    await $onError(error)
    callback($createErrorResponse(error))
  } finally {
    await $finally()
  }
}
```

Each of the `$` parameters (except `$handler`) [can be customized](https://github.com/catamphetamine/serverless-functions/tree/master/source/code/pieces) by adding a respective `code` entry in `serverless.json`:

```js
{
  "name": "project-name",
  "code": {
    "initialize": "./custom/initialize.js"
  }
}
```

`./custom/initialize.js` file path is resolved against the root project directory (`process.cwd()`).

#### `./custom/initialize.js`

```js
import Database from './database'
import config from './config'

function $initialize() {
  const database = new Database(config.database)
  database.connect()
  // Make the `database` accessible from functions.
  global.database = database
}
```

The global `database` variable can then be used inside functions:

```js
export default async function() {
  return {
    items: await database.items.findAll({ limit: 10 })
  }
}
```

## Globals

The execution envirnoment provides the following global constants:

  * `STAGE : string` — the current "stage" (e.g. `dev`, `prod`, `test`).
  * `FUNCTION : object` — the contents of `function.json`.
  * `LOCAL : boolean` — whether the functions are being run locally (`serverless run`) rather than being deployed in a cloud.

## Testing

For each function one should also create an `index.test.js` file with unit tests. Example using `mocha`/`chai`:

```js
import func from '.'

describe('function-name', () => {
  it('should return some result for some input', async () => {
    expect(await func(input)).to.deep.equal(output)
  })
})
```

## API

```js
import { run } from 'serverless-functions/aws-lambda'
import config from './serverless.json'

await run(stage, port, config, { cwd: process.cwd() })
```