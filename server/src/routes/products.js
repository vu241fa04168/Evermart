import express from 'express'
import mongoose from 'mongoose'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { parsePagination, validateBody } from '../middleware/validate.js'

export const productRouter = express.Router()

async function productQuery(request) {
  const query = { isActive: true }
  const numericFilters = ['minPrice', 'maxPrice', 'minRating']
  for (const filter of numericFilters) {
    if (request.query[filter] !== undefined && (!Number.isFinite(Number(request.query[filter])) || Number(request.query[filter]) < 0)) throw new AppError(`${filter} must be a non-negative number`, 400, 'VALIDATION_ERROR')
  }
  if (request.query.search) {
    const search = request.query.search.trim()
    const categoryMatches = await Category.find({ name: { $regex: search, $options: 'i' } }).select('_id')
    const searchOr = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $in: categoryMatches.map((category) => category._id) } },
    ]
    if (mongoose.isValidObjectId(search)) searchOr.push({ _id: search })
    query.$or = searchOr
  }
  if (request.query.category) {
    if (mongoose.isValidObjectId(request.query.category)) {
      query.category = request.query.category
    } else {
      const categoryMatch = await Category.findOne({ slug: request.query.category }).select('_id')
      if (categoryMatch) query.category = categoryMatch._id
      else query.category = null
    }
  }
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
  const query = await productQuery(request)
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
  const lowStockThreshold = request.body.lowStockThreshold === undefined ? 5 : Number(request.body.lowStockThreshold)
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) throw new AppError('lowStockThreshold must be a non-negative integer', 400, 'VALIDATION_ERROR')
  const product = await Product.create({
    name: request.body.name,
    description: request.body.description,
    price: Number(request.body.price),
    category: request.body.category,
    image: request.body.image,
    stock: Number(request.body.stock),
    lowStockThreshold,
    isActive: true,
  })
  response.status(201).json({ product })
}))

productRouter.patch('/:id', requireAuth, requireRole('admin'), asyncHandler(async (request, response) => {
  const updates = { ...request.body }
  delete updates._id; delete updates.createdAt; delete updates.rating; delete updates.reviewCount; delete updates.popularity
  if (updates.category && !(await Category.exists({ _id: updates.category }))) throw new AppError('Category not found', 400, 'INVALID_CATEGORY')
  if (updates.image !== undefined && !validateImageUrl(updates.image)) throw new AppError('Image must be a valid HTTP or HTTPS URL', 400, 'VALIDATION_ERROR')
  if (updates.price !== undefined) updates.price = Number(updates.price)
  if (updates.stock !== undefined) updates.stock = Number(updates.stock)
  if (updates.lowStockThreshold !== undefined) {
    updates.lowStockThreshold = Number(updates.lowStockThreshold)
    if (!Number.isInteger(updates.lowStockThreshold) || updates.lowStockThreshold < 0) {
      throw new AppError('lowStockThreshold must be a non-negative integer', 400, 'VALIDATION_ERROR')
    }
  }
  const product = await Product.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true })
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  response.json({ product })
}))

productRouter.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (request, response) => {
  const product = await Product.findByIdAndDelete(request.params.id)
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  response.status(204).send()
}))
