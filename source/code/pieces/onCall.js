async function $onCall(event, context) {
  // // Suspend the Node.js process immediately after response is sent.
  // // Fixes Sequelize connection pool preventing Node.js process from terminating.
  // context.callbackWaitsForEmptyEventLoop = false
}