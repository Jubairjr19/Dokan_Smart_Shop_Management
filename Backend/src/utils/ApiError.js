/** An error that is safe to show to the API client. */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details)
  }

  static unauthorized(message = 'Please sign in.') {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }

  static forbidden(message = 'You do not have permission to do this.') {
    return new ApiError(403, 'FORBIDDEN', message)
  }

  static notFound(what = 'Record') {
    return new ApiError(404, 'NOT_FOUND', `${what} not found.`)
  }

  static conflict(message, details) {
    return new ApiError(409, 'CONFLICT', message, details)
  }
}
