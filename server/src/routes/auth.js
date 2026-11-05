import bcrypt from 'bcryptjs'
import express from 'express'
import { User } from '../models/User.js'
import { clearAuthCookie, issueAuthCookie, requireAuth } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { validateBody } from '../middleware/validate.js'
import { normalizeEmail, publicUser } from '../utils/sanitize.js'

export const authRouter = express.Router()

const passwordIsValid = (password) => typeof password === 'string' && password.length >= 8 && password.length <= 128

authRouter.post('/register', validateBody(['name', 'email', 'password']), asyncHandler(async (request, response) => {
  const { name, email, password } = request.body
  if (!passwordIsValid(password)) throw new AppError('Password must be 8 to 128 characters', 400, 'VALIDATION_ERROR')
  const normalizedEmail = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new AppError('A valid email is required', 400, 'VALIDATION_ERROR')
  const exists = await User.exists({ email: normalizedEmail })
  if (exists) throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS')
  const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 12), role: 'customer' })
  issueAuthCookie(response, user._id)
  response.status(201).json({ user: publicUser(user) })
}))

authRouter.post('/login', validateBody(['email', 'password']), asyncHandler(async (request, response) => {
  const user = await User.findOne({ email: normalizeEmail(request.body.email) }).select('+password')
  if (!user || !(await bcrypt.compare(request.body.password, user.password))) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  issueAuthCookie(response, user._id)
  response.json({ user: publicUser(user) })
}))

authRouter.post('/logout', (_request, response) => { clearAuthCookie(response); response.status(204).send() })
authRouter.get('/me', requireAuth, (request, response) => response.json({ user: publicUser(request.user) }))
authRouter.patch('/me', requireAuth, asyncHandler(async (request, response) => {
  const allowed = ['name', 'address']
  const updates = Object.fromEntries(Object.entries(request.body).filter(([key]) => allowed.includes(key)))
  if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length < 2)) throw new AppError('Name is invalid', 400, 'VALIDATION_ERROR')
  const user = await User.findByIdAndUpdate(request.user._id, updates, { new: true, runValidators: true })
  response.json({ user: publicUser(user) })
}))
