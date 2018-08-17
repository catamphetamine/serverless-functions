import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'

import findFunctions from './findFunctions'
import installTransformHook from './transform'
import generateCode from './code/generate'

export default async function run(port, config) {
	const functions = await findFunctions()
	installTransformHook(functions, code => generateCode({ code }, config))
	await runServer(port, async (requestPath, { query, body, headers }) => {
		let func

		let pathParameters
		for (const _func of functions) {
			pathParameters = matchPath(requestPath, _func)
			if (pathParameters) {
				func = _func
				break
			}
		}

		let httpResponse

		if (!func) {
			return {
				status: 404,
				body: 'Not found'
			}
		}

		const module = require(path.join(func.directory, 'index.js'))
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
			handler(request.path, {
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

function matchPath(path, func) {
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