export class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message)
    this.status = status
    this.code = code
  }
}

export function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next)
}

export function errorHandler(error, _request, response, _next) {
  if (error?.code === 11000) {
    return response.status(409).json({ message: 'A record with that value already exists', code: 'DUPLICATE_VALUE' })
  }
  if (error?.name === 'ValidationError') {
    return response.status(400).json({ message: 'Validation failed', code: 'VALIDATION_ERROR', details: Object.values(error.errors).map(({ message }) => message) })
  }
  if (error?.name === 'CastError') {
    return response.status(400).json({ message: 'Invalid identifier or value', code: 'VALIDATION_ERROR' })
  }
  console.error(error)
  return response.status(error.status || 500).json({
    message: error.status ? error.message : 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
  })
}
