// https://stackoverflow.com/a/46971044/970769
class HTTPError {
  constructor(message, httpStatusCode) {
    this.name = this.constructor.name
    this.message = message
    this.httpStatusCode = httpStatusCode
    this.stack = (new Error(message)).stack
  }
}

HTTPError.prototype = Object.create(Error.prototype)
HTTPError.prototype.constructor = HTTPError

// 401 Unauthorized.
// The request requires user authentication.
export class Unauthenticated extends HTTPError {
  constructor(message = 'Not authenticated') {
    super(message, 401)
  }
}

// 403 Forbidden.
// The user has not enough privileges to perform this action.
// The server understood the request but refuses to authorize it.
export class Unauthorized extends HTTPError {
  constructor(message = 'Not authorized') {
    super(message, 403)
  }
}

// 404 Not found.
// The requested resource was not found.
export class NotFound extends HTTPError {
  constructor(message = 'Not found') {
    super(message, 404)
  }
}

// 409 Conflict
// The request could not be completed due to a conflict
// with the current state of the target resource.
// This code is used in situations where the user might be able
// to resolve the conflict and resubmit the request.
export class Conflict extends HTTPError {
  constructor(message = 'Conflict') {
    super(message, 409)
  }
}

// 422 Unprocessable Entity.
// The service supports the content type of the HTTP Request,
// and the syntax of the HTTP Request entity is correct,
// but was unable to process the contained instructions.
// (e.g. missing a required JSON field)
export class InputRejected extends HTTPError {
  constructor(message = 'Input rejected') {
    super(message, 422)
  }
}

// // 500 Internal Server Error.
// // HTTP Request input is valid, but the service encountered
// // an unexpected condition which prevented it from fulfilling the request.
// export class Error extends HTTPError {
//   constructor(message = 'Error') {
//     super(message, 500)
//   }
// }