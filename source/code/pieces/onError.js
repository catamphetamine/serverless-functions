async function $onError(error, context) {
  // CloudWatch error logging.
  // Uncaught promise rejections have to "stack" for some reason.
  console.error(error.stack || error)
  // // Notify devs by email about 5XX errors in production.
  // if (STAGE === 'prod' &&
  //   (!error.httpStatusCode || /5\\d\\d/.test(error.httpStatusCode))) {
  //   const errorNotificationText = \`\${context.functionName}\n\n\${error.stack}\n\nhttps://console.aws.amazon.com/cloudwatch/home?region=${REGION}#logEventViewer:group=\${context.logGroupName}stream=\${context.logStreamName}\`
  //   await sns.publish('backend-devs-queue', 'AWS Lambda Error', errorNotificationText)
  // }
}