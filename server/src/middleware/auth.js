import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError, asyncHandler } from './error.js'
import { User } from '../models/User.js'

const cookieName = 'fieldnote_token'

function requireSecret() {
  if (!env.jwtSecret || env.jwtSecret.length < 32) throw new AppError('JWT secret is not configured securely', 500, 'AUTH_CONFIG_ERROR')
}

export function issueAuthCookie(response, userId) {
  requireSecret()
  const token = jwt.sign({ sub: userId.toString() }, env.jwtSecret, { expiresIn: '7d' })
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? 'none' : 'lax',
    path: '/',
    domain: env.cookieDomain,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(response) {
  response.clearCookie(cookieName, { httpOnly: true, secure: env.cookieSecure, sameSite: env.cookieSecure ? 'none' : 'lax', path: '/', domain: env.cookieDomain })
}

export const requireAuth = asyncHandler(async (request, _response, next) => {
  requireSecret()
  const token = request.cookies[cookieName]
  if (!token) throw new AppError('Authentication required', 401, 'UNAUTHENTICATED')
  let payload
  try { payload = jwt.verify(token, env.jwtSecret) } catch { throw new AppError('Invalid or expired authentication', 401, 'UNAUTHENTICATED') }
  const user = await User.findById(payload.sub).select('+password')
  if (!user) throw new AppError('Authentication required', 401, 'UNAUTHENTICATED')
  request.user = user
  next()
})

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'))
    next()
  }
}

export { cookieName }
