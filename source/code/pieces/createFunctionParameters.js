function $createFunctionParameters(event, context) {
  return {
    event,
    context,
    query: event.queryStringParameters,
    params: event.pathParameters,
    // `path` property is deprecated, use `params` instead.
    path: event.pathParameters,
    headers: event.headers,
    body: event.body
  }
}