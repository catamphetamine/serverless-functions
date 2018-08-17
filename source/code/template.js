export async function handler(event, context, callback) {
  try {
    await $onCall(event, context)
    const parameters = $createFunctionParameters(event, context)
    let result = await $handler(parameters)
    result = (await $onReturn(result)) || result
    callback(null, $createResponse(result))
  } catch (error) {
    await $onError(error)
    callback($createErrorResponse(error))
  } finally {
    await $finally()
  }
}