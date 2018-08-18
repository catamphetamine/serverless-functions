function $createErrorResponse(error) {
  const errorMessage = error.httpStatusCode ? error.message : 'Error'
  const statusCode = error.httpStatusCode ? error.httpStatusCode : 500
  return {
    // isBase64Encoded: false,
    statusCode,
    headers: $headers(error),
    body: JSON.stringify({
      errorMessage,
      statusCode
    })
  }
}