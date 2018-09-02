function $createFunctionParameters(event, context) {
  return {
    event,
    context,
    query: event.queryStringParameters,
    params: event.pathParameters,
    headers: event.headers,
    body: event.body
  }
}