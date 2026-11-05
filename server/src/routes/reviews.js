import express from 'express'
import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Review } from '../models/Review.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { validateBody } from '../middleware/validate.js'

export const reviewRouter = express.Router({ mergeParams: true })

reviewRouter.get('/', asyncHandler(async (request, response) => {
  const reviews = await Review.find({ product: request.params.productId }).populate('user', 'name').sort({ createdAt: -1 })
  response.json({ reviews })
}))

reviewRouter.post('/', requireAuth, validateBody(['rating', 'comment', 'orderId']), asyncHandler(async (request, response) => {
  const rating = Number(request.body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError('Rating must be an integer from 1 to 5', 400, 'VALIDATION_ERROR')
  const session = await mongoose.startSession()
  let createdReview
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: request.body.orderId, user: request.user._id, orderStatus: 'Delivered' }).session(session)
      const purchased = order?.products.some((item) => item.product.toString() === request.params.productId)
      if (!purchased) throw new AppError('Only purchasers of delivered orders can review this product', 403, 'PURCHASE_VERIFICATION_REQUIRED')
      if (await Review.exists({ user: request.user._id, product: request.params.productId }).session(session)) throw new AppError('You have already reviewed this product', 409, 'REVIEW_EXISTS')
      const [review] = await Review.create([{ user: request.user._id, product: request.params.productId, order: order._id, rating, comment: request.body.comment }], { session })
      const [aggregate] = await Review.aggregate([{ $match: { product: new mongoose.Types.ObjectId(request.params.productId) } }, { $group: { _id: '$product', rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }]).session(session)
      await Product.updateOne({ _id: request.params.productId }, { $set: { rating: aggregate?.rating || 0, reviewCount: aggregate?.reviewCount || 0 } }, { session })
      createdReview = review
    })
    response.status(201).json({ review: await Review.findById(createdReview._id).populate('user', 'name') })
  } finally {
    await session.endSession()
  }
}))