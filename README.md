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

```json
{
  "name": "project-name"
}
```

To create a function create a directory anywhere inside the project directory and put `index.js` and `function.json` files in that directory.

`function.json` is the description of the function, i.e. its name, which URL does it respond on, to which HTTP method, etc.

```json
{
  "name": "function-name",
  "path": "/example-function/{parameterName}",
  "method": "GET"
}
```

`index.js` is the function code:

```js
export default async function({ path, body, query, event }) {
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

```json
{
  "scripts": {
    "run-locally": "serverless run"
  }
}
```

Run the functions locally:

```
npm run run-locally 8888
```

Go to `http://localhost:8888/example-function/123`. It should respond with `{ pathParameter: 123 }`.

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

## Streaming

Currently serverless functions seem to not support streaming HTTP request/response data. Use the old-school Node.js stuff for that (e.g. `express`).

## AWS Setup

See the [AWS Lambda guide](https://github.com/catamphetamine/serverless-functions/blob/master/README-AWS.md).