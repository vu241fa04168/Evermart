import { AppError } from './error.js'

export function validateBody(requiredFields = []) {
  return (request, _response, next) => {
    const body = request.body || {}
    const missing = requiredFields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '')
    if (missing.length) return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR'))
    next()
  }
}

export function parsePagination(request, _response, next) {
  const rawPage = request.query.page ?? '1'
  const rawLimit = request.query.limit ?? '12'
  if (!/^\d+$/.test(String(rawPage)) || !/^\d+$/.test(String(rawLimit))) return next(new AppError('page and limit must be positive integers', 400, 'VALIDATION_ERROR'))
  const page = Number(rawPage)
  const limit = Number(rawLimit)
  if (page < 1 || limit < 1 || limit > 100) return next(new AppError('page must be at least 1 and limit must be between 1 and 100', 400, 'VALIDATION_ERROR'))
  request.pagination = { page, limit, skip: (page - 1) * limit }
  next()
}

export function isValidObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value)
}
