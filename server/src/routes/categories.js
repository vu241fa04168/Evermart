import express from 'express'
import { Category } from '../models/Category.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { parsePagination, validateBody } from '../middleware/validate.js'
import { Product } from '../models/Product.js'
import { slugify } from '../utils/slug.js'

export const categoryRouter = express.Router()

categoryRouter.get('/', asyncHandler(async (_request, response) => {
  response.json({ categories: await Category.find({ isActive: true }).sort({ name: 1 }) })
}))

categoryRouter.get('/admin', requireAuth, requireRole('admin'), parsePagination, asyncHandler(async (request, response) => {
  const [categories, total] = await Promise.all([
    Category.find().sort({ name: 1 }).skip(request.pagination.skip).limit(request.pagination.limit),
    Category.countDocuments(),
  ])
  response.json({ categories, pagination: { page: request.pagination.page, limit: request.pagination.limit, total, pages: Math.ceil(total / request.pagination.limit) } })
}))

categoryRouter.post('/', requireAuth, requireRole('admin'), validateBody(['name']), asyncHandler(async (request, response) => {
  const name = request.body.name.trim()
  const category = await Category.create({ name, slug: slugify(name), description: request.body.description })
  response.status(201).json({ category })
}))

categoryRouter.patch('/:id', requireAuth, requireRole('admin'), asyncHandler(async (request, response) => {
  const updates = {}
  if (request.body.name !== undefined) { updates.name = request.body.name.trim(); updates.slug = slugify(updates.name) }
  if (request.body.description !== undefined) updates.description = request.body.description
  if (request.body.isActive !== undefined) updates.isActive = Boolean(request.body.isActive)
  const category = await Category.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true })
  if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND')
  response.json({ category })
}))

categoryRouter.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (request, response) => {
  const used = await Product.exists({ category: request.params.id })
  if (used) throw new AppError('Category is assigned to products; archive it instead', 409, 'CATEGORY_IN_USE')
  const category = await Category.findByIdAndDelete(request.params.id)
  if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND')
  response.status(204).send()
}))
