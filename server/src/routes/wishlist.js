import express from 'express'
import { Product } from '../models/Product.js'
import { Wishlist } from '../models/Wishlist.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'

export const wishlistRouter = express.Router()
wishlistRouter.use(requireAuth)

async function getWishlist(userId) {
  return Wishlist.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, products: [] } }, { upsert: true, new: true }).populate('products', 'name price image stock rating')
}

wishlistRouter.get('/', asyncHandler(async (request, response) => response.json({ wishlist: await getWishlist(request.user._id) })))

wishlistRouter.put('/:productId', asyncHandler(async (request, response) => {
  const product = await Product.findById(request.params.productId)
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  const wishlist = await Wishlist.findOneAndUpdate({ user: request.user._id }, { $addToSet: { products: product._id } }, { upsert: true, new: true })
  response.json({ wishlist: await wishlist.populate('products', 'name price image stock rating') })
}))

wishlistRouter.delete('/:productId', asyncHandler(async (request, response) => {
  const wishlist = await Wishlist.findOneAndUpdate({ user: request.user._id }, { $pull: { products: request.params.productId } }, { new: true })
  response.json({ wishlist: await (wishlist || getWishlist(request.user._id)) })
}))
