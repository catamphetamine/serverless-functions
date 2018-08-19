import {
	run
} from '../index'

import {
	createApi,
	updateRoutes,
	deploy
} from '../aws-lambda'

describe(`exports`, function()
{
	it(`should export ES6`, function()
	{
		run.should.be.a('function')
	})

	it(`should export CommonJS`, function()
	{
		const Library = require('../index.commonjs')

		Library.run.should.be.a('function')
	})

	it(`should export AWS Lambda toolkit`, function()
	{
		createApi.should.be.a('function')
		updateRoutes.should.be.a('function')
		deploy.should.be.a('function')
	})
})