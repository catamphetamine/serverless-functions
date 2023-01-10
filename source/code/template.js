export async function handler(event, context, callback) {
  $catchUnhandledErrors(context, callback)
  try {
    await $onCall(event, context)
    const parameters = $createFunctionParameters(event, context)
    let result = await $handler(parameters)
    result = (await $onReturn(result)) || result
    callback(null, $createResponse(result))
  } catch (error) {
    await $onError(error, context)
    callback(null, $createErrorResponse(error))
  } finally {
    await $finally()
  }
}