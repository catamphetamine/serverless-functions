async function $catchUnhandledErrors(context, callback) {
  // Add unexpected error handlers
  // DEV: AWS Lambda's "uncaughtException" handler logs "err.stack" and exits forcefully
  // uncaughtException listeners = [function (err) { console.error(err.stack); process.exit(1); }]
  // We remove it so we can catch async errors and report them.
  // https://gist.github.com/twolfson/855a823cfbd62d4c7405a38105c23fd3
  // Also removes the listeners set up in the previous lambda invocation
  // because a lambda will be reused if there's another request.
  process.removeAllListeners('uncaughtException')
  process.removeAllListeners('unhandledRejection')
  // Error handler.
  async function onError(error) {
    await $onError(error, context)
    callback($createErrorResponse(error))
  }
  // Catches "setTimeout()" errors so that they don't crash the app.
  process.on('uncaughtException', onError)
  // Catches "unhandled promise rejection" errors so that they don't crash the app.
  process.on('unhandledRejection', onError)
}