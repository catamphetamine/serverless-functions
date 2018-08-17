function $createFunctionParameters(event, context) {
  return {
    event,
    context,
    query: event.queryStringParameters,
    path: event.pathParameters,
    headers: event.headers,
    body: event.body
  }
}