import express from 'express'
import mongoose from 'mongoose'
import { Category } from '../models/Category.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { parsePagination } from '../middleware/validate.js'
import { Review } from '../models/Review.js'

export const adminRouter = express.Router()
adminRouter.use(requireAuth, requireRole('admin'))

adminRouter.get('/dashboard', asyncHandler(async (request, response) => {
  const lowStockLimit = Math.min(Math.max(Number(request.query.lowStock || 5), 0), 100)
  const [products, customers, orders, revenue, recentOrders, lowStockProducts] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'customer' }),
    Order.countDocuments(),
    Order.aggregate([{ $match: { orderStatus: 'Delivered' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(6).select('-__v'),
    Product.find({ isActive: true, $expr: { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', lowStockLimit] }] } }).populate('category', 'name').sort({ stock: 1, name: 1 }).limit(10),
  ])
  response.json({ stats: { products, customers, orders, revenue: revenue[0]?.total || 0 }, recentOrders, lowStockProducts })
}))

adminRouter.get('/products', parsePagination, asyncHandler(async (request, response) => {
  const query = {}
  if (request.query.search) {
    const search = request.query.search.trim()
    const categoryMatches = await Category.find({ name: { $regex: search, $options: 'i' } }).select('_id')
    const searchOr = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }, { category: { $in: categoryMatches.map((category) => category._id) } }]
    if (mongoose.isValidObjectId(search)) searchOr.push({ _id: search })
    query.$or = searchOr
  }
  if (request.query.category) query.category = request.query.category
  if (request.query.status === 'active') query.isActive = true
  if (request.query.status === 'archived') query.isActive = false
  const [products, total] = await Promise.all([
    Product.find(query).populate('category', 'name slug').sort({ createdAt: -1 }).skip(request.pagination.skip).limit(request.pagination.limit),
    Product.countDocuments(query),
  ])
  response.json({ products, pagination: { page: request.pagination.page, limit: request.pagination.limit, total, pages: Math.ceil(total / request.pagination.limit) } })
}))

adminRouter.get('/orders', parsePagination, asyncHandler(async (request, response) => {
  const query = {}
  if (request.query.status) query.orderStatus = request.query.status
  if (request.query.paymentStatus) query.paymentStatus = request.query.paymentStatus
  if (request.query.search) {
    const search = request.query.search.trim()
    const users = await User.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }).select('_id')
    query.$or = [{ user: { $in: users.map((user) => user._id) } }, { 'products.name': { $regex: search, $options: 'i' } }]
    if (mongoose.isValidObjectId(search)) query.$or.push({ _id: search })
  }
  const [orders, total] = await Promise.all([
    Order.find(query).populate('user', 'name email').populate('products.product', 'name image').sort({ createdAt: -1 }).skip(request.pagination.skip).limit(request.pagination.limit),
    Order.countDocuments(query),
  ])
  response.json({ orders, pagination: { page: request.pagination.page, limit: request.pagination.limit, total, pages: Math.ceil(total / request.pagination.limit) } })
}))

adminRouter.get('/users', parsePagination, asyncHandler(async (request, response) => {
  const query = { role: 'customer' }
  if (request.query.search) query.$or = [{ name: { $regex: request.query.search.trim(), $options: 'i' } }, { email: { $regex: request.query.search.trim(), $options: 'i' } }]
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(request.pagination.skip).limit(request.pagination.limit),
    User.countDocuments(query),
  ])
  response.json({ users, pagination: { page: request.pagination.page, limit: request.pagination.limit, total, pages: Math.ceil(total / request.pagination.limit) } })
}))

adminRouter.get('/users/:id', asyncHandler(async (request, response) => {
  const user = await User.findOne({ _id: request.params.id, role: 'customer' })
  if (!user) throw new AppError('Customer not found', 404, 'NOT_FOUND')
  const orders = await Order.find({ user: user._id }).populate('products.product', 'name image').sort({ createdAt: -1 })
  response.json({ user, orders })
}))

adminRouter.get('/categories', parsePagination, asyncHandler(async (request, response) => {
  const [categories, total] = await Promise.all([
    Category.find().sort({ name: 1 }).skip(request.pagination.skip).limit(request.pagination.limit),
    Category.countDocuments(),
  ])
  response.json({ categories, pagination: { page: request.pagination.page, limit: request.pagination.limit, total, pages: Math.ceil(total / request.pagination.limit) } })
}))

adminRouter.get('/reviews', parsePagination, asyncHandler(async (request, response) => {
  const query = {}
  if (request.query.search) {
    const search = request.query.search.trim()
    const [users, products] = await Promise.all([
      User.find({ name: { $regex: search, $options: 'i' } }).select('_id'),
      Product.find({ name: { $regex: search, $options: 'i' } }).select('_id'),
    ])
    query.$or = [{ comment: { $regex: search, $options: 'i' } }, { user: { $in: users.map((user) => user._id) } }, { product: { $in: products.map((product) => product._id) } }]
  }
  const [reviews, total] = await Promise.all([
    Review.find(query).populate('user', 'name email').populate('product', 'name image').sort({ createdAt: -1 }).skip(request.pagination.skip).limit(request.pagination.limit),
    Review.countDocuments(query),
  ])
  response.json({ reviews, pagination: { page: request.pagination.page, limit: request.pagination.limit, total, pages: Math.ceil(total / request.pagination.limit) } })
}))

adminRouter.delete('/reviews/:id', asyncHandler(async (request, response) => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const review = await Review.findByIdAndDelete(request.params.id, { session })
      if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND')
      const [aggregate] = await Review.aggregate([
        { $match: { product: review.product } },
        { $group: { _id: '$product', rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ]).session(session)
      await Product.updateOne({ _id: review.product }, { $set: { rating: aggregate?.rating || 0, reviewCount: aggregate?.reviewCount || 0 } }, { session })
    })
    response.status(204).send()
  } finally {
    await session.endSession()
  }
}))