export function validateLambda(lambda) {
  if (!lambda.name) {
    throw new Error(`"name" property is required for lambda. ${debugInfo(lambda)}`)
  }
  // // A lambda can be a scheduled job, not neccessarily an HTTP-called one.
  // if (lambda.path) {
  //   if (!lambda.method) {
  //     throw new Error(`"method" property is required for lambda. ${debugInfo(lambda)}`)
  //   }
  // }
}

function debugInfo(lambda) {
  return `\n\n${JSON.stringify(lambda)}`;
}

export const IAM_ROLE_REG_EXP = /arn:aws:iam::(\d+):role\/lambda/

export function validateIAMRole(role) {
  if (!IAM_ROLE_REG_EXP.test(role)) {
    throw new Error(`Incorrect lambda IAM role format, expected something like "arn:aws:iam::123456789012:role/lambda". Got "${role}".`)
  }
}