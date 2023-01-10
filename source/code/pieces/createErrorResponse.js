function $createErrorResponse(error) {
  const errorObject = {
    message: error.message || 'Error',
    ...error.data
  }
  const statusCode = error.httpStatusCode ? error.httpStatusCode : 500
  return {
    // isBase64Encoded: false,
    statusCode,
    headers: $headers(error),
    body: JSON.stringify({
      error: errorObject,
      statusCode
    })
  }
}