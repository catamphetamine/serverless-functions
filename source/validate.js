export const RESERVED_FUNCTION_DESCRIPTION_PROPERTIES = [
  'directory'
]

export function validateFunctionDescription(description) {
  if (!description.name) {
    throw new Error(`"name" property is required for a function. ${debugInfo(description)}`)
  }
  for (const property of RESERVED_FUNCTION_DESCRIPTION_PROPERTIES) {
    if (description[property]) {
      throw new Error(`"${property}" property name is reserved inside "function.json". ${debugInfo(description)}`)
    }
  }
  // A function can be a scheduled job, not neccessarily an HTTP-called one.
  if (description.path) {
    if (!description.method) {
      throw new Error(`"method" property is required for a function listening on a URL path. ${debugInfo(description)}`)
    }
  }
}

function debugInfo(object) {
  return `\n\n${JSON.stringify(object)}`;
}