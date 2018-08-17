'use strict'

exports = module.exports = {}

exports.createApi = require('./commonjs/aws-lambda/api').createApi
exports.updateRoutes = require('./commonjs/aws-lambda/api').updateApi
exports.deploy = require('./commonjs/aws-lambda/deploy').default