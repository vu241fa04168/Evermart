import express from 'express'
import { Cart } from '../models/Cart.js'
import { Product } from '../models/Product.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { isValidObjectId } from '../middleware/validate.js'

export const cartRouter = express.Router()
cartRouter.use(requireAuth)

async function getCart(userId) {
  return Cart.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, items: [] } }, { upsert: true, new: true }).populate('items.product', 'name price image stock')
}

cartRouter.get('/', asyncHandler(async (request, response) => response.json({ cart: await getCart(request.user._id) })))

cartRouter.put('/items/:productId', asyncHandler(async (request, response) => {
  if (!isValidObjectId(request.params.productId)) throw new AppError('Invalid product id', 400, 'VALIDATION_ERROR')
  const quantity = Number(request.body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new AppError('Quantity must be an integer between 1 and 99', 400, 'VALIDATION_ERROR')
  const product = await Product.findById(request.params.productId)
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  if (quantity > product.stock) throw new AppError('Requested quantity exceeds stock', 409, 'INSUFFICIENT_STOCK')
  const cart = await Cart.findOneAndUpdate({ user: request.user._id, 'items.product': product._id }, { $set: { 'items.$.quantity': quantity } }, { new: true })
  const nextCart = cart || await Cart.findOneAndUpdate({ user: request.user._id }, { $push: { items: { product: product._id, quantity } } }, { upsert: true, new: true })
  response.json({ cart: await nextCart.populate('items.product', 'name price image stock') })
}))

cartRouter.delete('/items/:productId', asyncHandler(async (request, response) => {
  const cart = await Cart.findOneAndUpdate({ user: request.user._id }, { $pull: { items: { product: request.params.productId } } }, { new: true })
  response.json({ cart: await (cart || getCart(request.user._id)) })
}))

cartRouter.delete('/', asyncHandler(async (request, response) => {
  const cart = await Cart.findOneAndUpdate({ user: request.user._id }, { $set: { items: [] } }, { upsert: true, new: true })
  response.json({ cart })
}))
