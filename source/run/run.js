import fs from 'fs'
import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'

import findFunctions from '../findFunctions.js'
import transform, { initializeTransform } from './transform.js'
import generateCode from '../code/generate.js'
import Router from './router.js'

export default async function run(stage, port, config, options = {}) {
	initializeTransform(options)

	const functions = await findFunctions(null, options.cwd)

	const router = new Router(functions)

	await runServer(port, async (method, requestPath, { query, body, headers }) => {
		const { error, func, pathParameters } = router.match(method, requestPath)

		if (error) {
			return {
				status: error.statusCode,
				headers: error.headers,
				contentType: 'text/plain',
				body: error.message
			}
		}

		let functionFilePath = path.join(func.directory, 'index.js')

		// // Convert Windows file path to `file://` protocol URL.
		// // https://github.com/nodejs/node/issues/20080
		// functionFilePath = new URL(`file:///${functionFilePath}`)

		// // const module = await import(functionFilePath)

		let functionCode = await readFilePromise(functionFilePath)

		functionCode = transform(functionCode, functionFilePath, (code, filename) => {
			return generateCode({
				cwd: options.cwd,
				func: functions.filter(_ => path.join(_.directory, 'index.js') === filename)[0],
				stage,
				local: true,
				code,
				path: filename
			}, config, options)
		}, { functions })

		// Doesn't work: throws `TypeError: Invalid URL`.
		// https://github.com/nodejs/node/issues/43280
		// const module = await import(`data:text/javascript;base64,${Buffer.from(functionCode).toString(`base64`)}`)

		let uncachePostfix
		// if (config.cache !== true)
		if (stage !== 'prod') {
			// Clear `import` cache.
			// https://ar.al/2021/02/22/cache-busting-in-node.js-dynamic-esm-imports/
			// https://github.com/nodejs/modules/issues/307#issuecomment-1336020135
			uncachePostfix = `&timestamp=${Date.now()}`
			// delete require.cache[functionFilePath]
		}

		const codeTemporaryFilePath = path.join(options.cwd, 'serverless-function.temp.js')
		await writeFilePromise(codeTemporaryFilePath, functionCode)
		let module
		try {
			// Append `?moduleId=${functionFilePath}` prefix so that `import()` doesn't cache
			// one function's code and return it for all other functions.
			const moduleUniquePostfix = `?moduleId=${functionFilePath}`
			module = await import(new URL(`file:///${codeTemporaryFilePath}${moduleUniquePostfix}${uncachePostfix}`))
		} finally {
			await deleteFilePromise(codeTemporaryFilePath)
		}

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

function readFilePromise(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, (error, fileBuffer) => {
			if (error) {
				return reject(error)
			}
			return resolve(fileBuffer.toString())
		})
	})
}

function writeFilePromise(path, content) {
	return new Promise((resolve, reject) => {
		fs.writeFile(path, content, (error) => {
			if (error) {
				return reject(error)
			}
			return resolve()
		})
	})
}

function deleteFilePromise(path) {
	return new Promise((resolve, reject) => {
		fs.unlink(path, (error) => {
			if (error) {
				return reject(error)
			}
			return resolve()
		})
	})
}