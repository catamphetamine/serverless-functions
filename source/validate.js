export function validateFunctionDescription(description) {
  if (!description.name) {
    throw new Error(`"name" property is required for a function. ${debugInfo(description)}`)
  }
  // // A function can be a scheduled job, not neccessarily an HTTP-called one.
  // if (description.path) {
  //   if (!description.method) {
  //     throw new Error(`"method" property is required for a function. ${debugInfo(description)}`)
  //   }
  // }
}

function debugInfo(object) {
  return `\n\n${JSON.stringify(object)}`;
}