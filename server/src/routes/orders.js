import express from 'express'
import { Order } from '../models/Order.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { placeOrder, cancelOrder } from '../services/orderService.js'

export const orderRouter = express.Router()
orderRouter.use(requireAuth)

orderRouter.post('/', asyncHandler(async (request, response) => {
  const order = await placeOrder({ userId: request.user._id, shippingAddress: request.body.shippingAddress, paymentMethod: request.body.paymentMethod })
  response.status(201).json({ order })
}))

orderRouter.get('/', asyncHandler(async (request, response) => {
  const filter = request.user.role === 'admin' && request.query.all === 'true' ? {} : { user: request.user._id }
  const orders = await Order.find(filter).populate('products.product', 'name image').sort({ createdAt: -1 })
  response.json({ orders })
}))

orderRouter.get('/:id', asyncHandler(async (request, response) => {
  const filter = request.user.role === 'admin' ? { _id: request.params.id } : { _id: request.params.id, user: request.user._id }
  const order = await Order.findOne(filter).populate('products.product', 'name image')
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND')
  response.json({ order })
}))

orderRouter.post('/:id/cancel', asyncHandler(async (request, response) => {
  const order = await cancelOrder({ orderId: request.params.id, userId: request.user._id, isAdmin: request.user.role === 'admin', reason: request.body?.reason })
  response.json({ order })
}))

orderRouter.patch('/:id/status', requireRole('admin'), asyncHandler(async (request, response) => {
  const nextStatus = request.body?.orderStatus
  const transitions = { Processing: ['Shipped', 'Delivered'], Shipped: ['Delivered'], Delivered: [], Cancelled: [] }
  if (!Object.keys(transitions).includes(nextStatus)) throw new AppError('Invalid order status', 400, 'VALIDATION_ERROR')
  const current = await Order.findById(request.params.id).select('orderStatus')
  if (!current) throw new AppError('Order not found', 404, 'NOT_FOUND')
  if (!transitions[current.orderStatus].includes(nextStatus)) throw new AppError('Order status transition is not allowed', 409, 'INVALID_STATUS_TRANSITION')
  const order = await Order.findOneAndUpdate({ _id: request.params.id, orderStatus: current.orderStatus }, { $set: { orderStatus: nextStatus } }, { new: true, runValidators: true })
  if (!order) throw new AppError('Order status changed concurrently; retry the request', 409, 'CONCURRENT_STATUS_UPDATE')
  response.json({ order })
}))

orderRouter.patch('/:id/payment', requireRole('admin'), asyncHandler(async (request, response) => {
  if (request.body?.paymentStatus !== 'Paid') throw new AppError('COD payment can only be marked as Paid', 400, 'INVALID_PAYMENT_STATUS')
  const order = await Order.findOneAndUpdate({ _id: request.params.id, paymentMethod: 'cod', paymentStatus: 'Pending', orderStatus: { $ne: 'Cancelled' } }, { $set: { paymentStatus: 'Paid' } }, { new: true, runValidators: true })
  if (!order) throw new AppError('COD payment is already paid, cancelled, or the order was not found', 409, 'PAYMENT_UPDATE_NOT_ALLOWED')
  response.json({ order })
}))
