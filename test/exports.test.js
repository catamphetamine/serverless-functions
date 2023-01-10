import {
	run
} from '../index.js'

import Library from '../index.cjs'

import {
	createApi,
	updateRoutes,
	deploy
} from '../aws-lambda.js'

import AWSLambda from '../aws-lambda.cjs'

import Errors from '../errors.cjs'

import {
	InputRejected
} from '../errors.js'

describe(`exports`, function()
{
	it(`should export ES6`, function()
	{
		run.should.be.a('function')
	})

	it(`should export CommonJS`, function()
	{
		Library.run.should.be.a('function')
	})

	it(`should export AWS Lambda toolkit`, function()
	{
		createApi.should.be.a('function')
		updateRoutes.should.be.a('function')
		deploy.should.be.a('function')
	})

	it(`should export AWS Lambda toolkit (CommonJS)`, function()
	{
		AWSLambda.createApi.should.be.a('function')
		AWSLambda.updateRoutes.should.be.a('function')
		AWSLambda.deploy.should.be.a('function')
	})

	it(`should export errors`, function() {
		InputRejected.should.be.a('function')
	})

	it(`should export errors (CommonJS)`, function() {
		Errors.InputRejected.should.be.a('function')
	})
})