async function $onCall(event, context) {
  // // Suspend the Node.js process immediately after response is sent.
  // // Fixes Sequelize connection pool preventing Node.js process from terminating.
  // // https://github.com/sequelize/sequelize/issues/8468
  // // I checked with "sequelize@5" and without this flag and it didn't work.
  // context.callbackWaitsForEmptyEventLoop = false;
}