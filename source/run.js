import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'

import findFunctions from './findFunctions'
import installTransformHook from './transform'
import generateCode from './code/generate'

export default async function run(stage, port, config, options = {}) {
	const functions = await findFunctions(null, options.cwd)

	installTransformHook(functions, (code, filename) => generateCode({
		cwd: options.cwd,
		func: functions.filter(_ => path.join(_.directory, 'index.js') === filename)[0],
		stage,
		code
	}, config, options), options)

	await runServer(port, async (method, requestPath, { query, body, headers }) => {
		let func

		let pathParameters
		for (const _func of functions) {
			pathParameters = matchFunctionByMethodAndPath(method, requestPath, _func)
			if (pathParameters) {
				func = _func
				break
			}
		}

		let httpResponse

		// Theoretically it should return "405 Method not allowed"
		// along with the "Allow" HTTP header (e.g. "Allow: GET, POST, HEAD")
		// if the path does exist but no function for the HTTP request method exists.
		// https://stackoverflow.com/questions/35387209/which-status-to-return-for-request-to-invalid-url-for-different-http-methods
		if (!func) {
			return {
				status: 404,
				body: 'Not found'
			}
		}

		const functionFilePath = path.join(func.directory, 'index.js')
		// if (config.cache !== true)
		if (stage !== 'prod') {
			delete require.cache[functionFilePath]
		}
		const module = require(functionFilePath)

		let response
		await module.handler({
			queryStringParameters: query,
			pathParameters,
			body,
			headers
		}, {}, (error, result) => {
			if (error) {
				if (error.statusCode) {
					result = error
				} else {
					throw error
				}
			}
			response = {
				status: result.statusCode,
				headers: result.headers,
				body: result.body
			}
		})
		return response
	})
}

function runServer(port, handler) {
	return new Promise((resolve, reject) => {
		const app = express()
		// Parse application/json.
		app.use(bodyParser.json())
		app.use((request, response) => {
			handler(request.method, request.path, {
				query: request.query,
				body: request.body,
				headers: request.headers
			}).then(({ status, contentType, body }) => {
				response.status(status)
				response.setHeader('Content-Type', contentType || 'application/json')
				response.end(body)
			})
		})
		app.listen(port, resolve)
	})
}

function matchFunctionByMethodAndPath(method, path, func) {
	if (method !== (func.method || 'GET')) {
		return
	}
	const pathParts = path.split('/')
	const funcPathParts = func.path.split('/')
	if (pathParts.length !== funcPathParts.length) {
		return
	}
	const parameters = {}
	let i = 0
	while (i < pathParts.length) {
		const pathPart = pathParts[i]
		const funcPathPart = funcPathParts[i]
		if (funcPathPart.indexOf('{') === 0) {
			const parameterName = funcPathPart.slice(1, -1)
			const parameterValue = pathPart
			parameters[parameterName] = parameterValue
		} else if (pathPart !== funcPathPart) {
			return
		}
		i++
	}
	return parameters
}