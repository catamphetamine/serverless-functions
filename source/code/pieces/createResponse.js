function $createResponse(result = {}) {
  return {
    // isBase64Encoded: false,
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(result)
  }
}