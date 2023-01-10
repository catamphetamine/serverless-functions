'use strict'

exports = module.exports = {}

exports.createApi = require('./commonjs/aws-lambda/api.js').createApi
exports.updateRoutes = require('./commonjs/aws-lambda/api.js').updateApi
exports.deploy = require('./commonjs/aws-lambda/deploy.js').default