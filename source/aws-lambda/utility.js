const IAM_ROLE_REG_EXP = /arn:aws:iam::(\d+):role\/lambda/

export function validateIAMRole(role) {
  if (!IAM_ROLE_REG_EXP.test(role)) {
    throw new Error(`Incorrect IAM role format, expected something like "arn:aws:iam::123456789012:role/name". Got "${role}".`)
  }
}

export function getAWSAccountId(role) {
  validateIAMRole(role)
  return role.match(IAM_ROLE_REG_EXP)[1]
}