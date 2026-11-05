import express from 'express'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { parsePagination, validateBody } from '../middleware/validate.js'

export const productRouter = express.Router()

function productQuery(request) {
  const query = { isActive: true }
  const numericFilters = ['minPrice', 'maxPrice', 'minRating']
  for (const filter of numericFilters) {
    if (request.query[filter] !== undefined && (!Number.isFinite(Number(request.query[filter])) || Number(request.query[filter]) < 0)) throw new AppError(`${filter} must be a non-negative number`, 400, 'VALIDATION_ERROR')
  }
  if (request.query.search) query.$text = { $search: request.query.search.trim() }
  if (request.query.category) query.category = request.query.category
  if (request.query.minPrice || request.query.maxPrice) query.price = {}
  if (request.query.minPrice) query.price.$gte = Math.max(Number(request.query.minPrice), 0)
  if (request.query.maxPrice) query.price.$lte = Math.max(Number(request.query.maxPrice), 0)
  if (request.query.minRating) query.rating = { $gte: Math.min(Math.max(Number(request.query.minRating), 0), 5) }
  return query
}

function validateImageUrl(image) {
  try {
    const url = new URL(image)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

productRouter.get('/', parsePagination, asyncHandler(async (request, response) => {
  const query = productQuery(request)
  const sortMap = { priceAsc: { price: 1 }, priceDesc: { price: -1 }, rating: { rating: -1 }, popularity: { popularity: -1 }, newest: { createdAt: -1 } }
  const sort = sortMap[request.query.sort] || sortMap.newest
  const [products, total] = await Promise.all([
    Product.find(query).populate('category', 'name slug').sort(sort).skip(request.pagination.skip).limit(request.pagination.limit),
    Product.countDocuments(query),
  ])
  response.json({ products, pagination: { page: request.pagination.page, limit: request.pagination.limit, total, pages: Math.ceil(total / request.pagination.limit) } })
}))

productRouter.get('/:id', asyncHandler(async (request, response) => {
  const product = await Product.findOne({ _id: request.params.id, isActive: true }).populate('category', 'name slug')
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  response.json({ product })
}))

productRouter.post('/', requireAuth, requireRole('admin'), validateBody(['name', 'description', 'price', 'category', 'image', 'stock']), asyncHandler(async (request, response) => {
  const category = await Category.findById(request.body.category)
  if (!category) throw new AppError('Category not found', 400, 'INVALID_CATEGORY')
  if (!validateImageUrl(request.body.image)) throw new AppError('Image must be a valid HTTP or HTTPS URL', 400, 'VALIDATION_ERROR')
  const product = await Product.create({ name: request.body.name, description: request.body.description, price: Number(request.body.price), category: request.body.category, image: request.body.image, stock: Number(request.body.stock) })
  response.status(201).json({ product })
}))

productRouter.patch('/:id', requireAuth, requireRole('admin'), asyncHandler(async (request, response) => {
  const updates = { ...request.body }
  delete updates._id; delete updates.createdAt; delete updates.rating; delete updates.reviewCount; delete updates.popularity
  if (updates.category && !(await Category.exists({ _id: updates.category }))) throw new AppError('Category not found', 400, 'INVALID_CATEGORY')
  if (updates.image !== undefined && !validateImageUrl(updates.image)) throw new AppError('Image must be a valid HTTP or HTTPS URL', 400, 'VALIDATION_ERROR')
  if (updates.price !== undefined) updates.price = Number(updates.price)
  if (updates.stock !== undefined) updates.stock = Number(updates.stock)
  const product = await Product.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true })
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  response.json({ product })
}))

productRouter.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (request, response) => {
  const product = await Product.findByIdAndDelete(request.params.id)
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  response.status(204).send()
}))
