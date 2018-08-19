#!/usr/bin/env node

var path = require('path')
var fs = require('fs')
var colors = require('colors/safe')

var createApi = require('../commonjs/aws-lambda/api').createApi
var updateApi = require('../commonjs/aws-lambda/api').updateApi
var deploy = require('../commonjs/aws-lambda/deploy').default
var run = require('../commonjs/run/run').default

var command = process.argv[2]
var config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'serverless.json')))

switch (command)
{
	case 'create-api':
		var stage = process.argv[3]
		return createApi(stage, config).catch(onError)

	case 'update-routes':
		var stage = process.argv[3]
		return updateApi(stage, config).catch(onError)

	case 'deploy':
		var stage = process.argv[3]
		var functionNames = Array.prototype.slice.call(process.argv, 4)
		if (functionNames.length === 0) {
			functionNames = null
		}
		return deploy(functionNames, stage, config).catch(onError)

	case 'run':
		var stage = process.argv[3]
		var port = process.argv[4]
		return run(stage, port, config)
			.then(() => console.log('The ' + colors.yellow(stage) + ' API is listening on ' + colors.green('http://localhost:' + port)))
			.catch(onError)

	default:
		usage()
}

function onError(error)
{
	console.error(colors.red(error.message))
	console.error()
	console.error(error.stack)
	process.exit(1)
}

function usage(reason)
{
	if (reason)
	{
		console.log(reason)
		console.log('')
	}

	console.log('Usage:')
	console.log('')
	console.log(' * Create API Gateway API:')
	console.log('')
	console.log('   serverless create-api <stage-name>')
	console.log('')
	console.log(' * Update ("deploy") API Gateway API:')
	console.log('')
	console.log('   serverless update-routes <stage-name>')
	console.log('')
	console.log(' * Deploy a function (or some functions, or all functions):')
	console.log('')
	console.log('   serverless deploy <stage-name> [function-name, function-name, ...]')
	console.log('')
	console.log(' * Run functions locally:')
	console.log('')
	console.log('   serverless run <stage-name> <port>')

	if (reason) {
		return process.exit(1)
	}

	process.exit(0)
}