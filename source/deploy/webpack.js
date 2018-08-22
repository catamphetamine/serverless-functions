import path from 'path'
import fs from 'fs'
import MemoryFS from 'memory-fs'
import webpack from 'webpack'

// await bundle(inputFile, outputFile)
export default function bundle(inputFile, outputFile, options = {}) {
  const inputDirectory = path.dirname(inputFile)
  const inputFileName = inputFile.slice(inputDirectory.length + 1)

  const outputDirectory = path.dirname(outputFile)
  const outputFileName = outputFile.slice(outputDirectory.length + 1)

  let outputFileSystem

  // // AWS Lambda runs Node.js >= 6.10.
  // const babelrc = options.babelrc || {
  //   "presets": [
  //     ["env", {
  //       "targets": {
  //         "node": options.nodeVersion || "6.10"
  //       }
  //     }]
  //   ],
  //   "plugins": [
  //     "transform-object-rest-spread",
  //     "transform-class-properties"
  //   ]
  //   .concat(options.babelPlugins || [])
  // }

  const rules = [{
    test: /\.js$/,
    exclude: /node_modules/,
    use: [{
      loader: 'babel-loader',
      // options: babelrc
    }]
  }].concat(options.moduleRules || [])

  if (options.emailAttachmentsDirectory) {
    rules.push({
      // test: /\.pdf$/,
      include: path.resolve(inputDirectory, options.emailAttachmentsDirectory),
      use: [{
        loader: 'base64-loader'
      }]
    })
  }

  // Bundle.
  return new Promise((resolve, reject) => {
    const compiler = webpack({
      // // Doesn't do anything.
      // context: options.basePath,
      // AWS Lambda doesn't seem to support source maps.
      devtool: 'source-map',
      mode: 'production',
      // optimization: {
      //   // Do not minimize the code.
      //   // AWS Lambda doesn't seem to support source maps.
      //   minimize: false
      // },
      performance: {
        // Turn off size warnings for entry points
        hints: false
      },
      context: inputDirectory,
      entry: ['babel-polyfill', `./${inputFileName}`],
      target: 'node',
      node: {
        __dirname: true,
        __filename: true
      },
      externals : {
        // `AWS` package is not included because it's not required.
        // Still there's no guarantee which exact `AWS` version
        // is present on Lambdas by default.
        // Hence it's not a safe approach.
        AWS: 'AWS',
        // Don't know what these two are for.
        fs: 'commonjs fs',
        path: 'commonjs path',
        // Some kind of Microsoft SQL Server support for Sequelize.
        // https://github.com/sequelize/sequelize/issues/7509
        tedious: 'tedious',
        // `sqlite3` is a "native binding" package
        // which means it can't be bundled with Webpack.
        // They seem to be using `require('node-pre-gyp').find`
        // to "dynamically require your installed binary".
        // https://www.npmjs.com/package/node-pre-gyp
        sqlite3: 'sqlite3',
        ...options.externals
      },
      output: {
        pathinfo: true,
        path: outputDirectory,
        filename: outputFileName,
        // libraryTarget: 'var'
        libraryTarget: 'commonjs'
      },
      module: {
        rules
      },
      plugins: [
        // https://github.com/webpack/webpack/issues/353
        new webpack.IgnorePlugin(/vertx/),

        // https://github.com/felixge/node-formidable/issues/337
        new webpack.DefinePlugin({
          'global.GENTLY': false,
          'process.env.NODE_PG_FORCE_NATIVE': false
        })
      ],
      // This custom resolving is not required when compiling in the source folder.
      // // For resolving `babel-loader`.
      // // Setting `context` doesn't work.
      // resolveLoader: {
      //   modules: [
      //     path.join(process.cwd(), 'node_modules'),
      //     'node_modules'
      //   ]
      // },
      resolve: {
        // This custom resolving is not required when compiling in the source folder.
        // // https://webpack.js.org/configuration/resolve/#resolve-modules
        // modules: [
        //   // Absolute paths don't work in some cases.
        //   // https://github.com/webpack/webpack/issues/7863
        //   path.join(process.cwd(), 'node_modules'),
        //   'node_modules'
        // ],
        alias: {
          'pg-native': path.resolve(__dirname, './webpack-empty-module.js'),
          ...options.alias
        },
        // Excluding "module" from `mainFields` to work around Webpack bug
        // https://github.com/webpack/webpack/issues/5756
        mainFields: ['main', 'module']
      }
    })

    if (!outputFile) {
      outputFileSystem = new MemoryFS()
      compiler.outputFileSystem = outputFileSystem
    }

    compiler.run((error, stats) => {
      if (error) {
        return reject(error)
      }

      // stats.toJson("minimal")
      // more options: "verbose", etc.
      const info = stats.toJson()

      if (stats.hasErrors()) {
        return reject(new Error(`Fix the following webpack build errors:\n${info.errors.map(error => '\n' + error + '\n')}`))
      }

      // There will be "Critical dependency: the request of a dependency is an expression" warnings.
      // No big deal for server side.
      // https://github.com/webpack/webpack/issues/196
      const warnings = info.warnings.filter(warning => warning.indexOf('Critical dependency: the request of a dependency is an expression') < 0)

      if (warnings.length > 0) {
        console.warn(`Webpack build warnings (not critical):\n${warnings.map(warning => '\n' + warning + '\n')}`)
      }

      if (outputFile) {
        return resolve(info)
      }

      resolve(fs.readFileSync(outputFile, 'utf-8'))
    })
  })
}
