import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'

import findFunctions from '../findFunctions'
import installTransformHook from './transform'
import generateCode from '../code/generate'
import Router from './router'

export default async function run(stage, port, config, options = {}) {
	const functions = await findFunctions(null, options.cwd)

	installTransformHook(functions, (code, filename) => generateCode({
		cwd: options.cwd,
		func: functions.filter(_ => path.join(_.directory, 'index.js') === filename)[0],
		stage,
		local: true,
		code
	}, config, options), options)

	const router = new Router(functions)

	await runServer(port, async (method, requestPath, { query, body, headers }) => {
		const { error, func, pathParameters } = router.match(method, requestPath)

		if (error) {
			return {
				status: error.statusCode,
				headers: error.headers,
				body: error.message
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
			}).then(({ status, contentType, headers, body }) => {
				response.status(status)
				response.set({
					'Content-Type': contentType || 'application/json',
					...headers
				})
				response.end(body)
			})
		})
		app.listen(port, resolve)
	})
}