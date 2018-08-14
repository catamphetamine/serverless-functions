import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'

import findFunctions from './findFunctions'
import installTransformHook from './transform'

export default async function run(port, config) {
	const functions = await findFunctions()
	installTransformHook(functions, code => code)
	await runServer(port, async (requestPath, { query, body }) => {
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
		try {
			const module = require(path.join(func.directory, 'index.js'))
			let response = await module.default({
				query,
				path: pathParameters,
				body
			})
			response = response || {}
			return {
				status: 200,
				body: JSON.stringify(response)
			}
		} catch (error) {
			console.error(error)
			return {
				status: error.httpStatusCode ? error.httpStatusCode : 500,
				body: error.httpStatusCode ? error.message : 'Error'
			}
		}
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
				body: request.body
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