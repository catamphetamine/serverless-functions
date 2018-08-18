function $createResponse(result = {}) {
  return {
    // isBase64Encoded: false,
    statusCode: 200,
    headers: $headers(null, result),
    body: JSON.stringify(result)
  }
}