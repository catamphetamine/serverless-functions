'use strict'

exports = module.exports = {}

const path = require('path')

require('./commonjs/dirname.js').setDirname(path.join(__dirname, 'commonjs'))

exports.run = require('./commonjs/run/run.js').default