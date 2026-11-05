import mongoose from 'mongoose'
import { Cart } from '../models/Cart.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { AppError } from '../middleware/error.js'

const allowedCancellationStatuses = ['Processing']

function normalizeAddress(address) {
  if (!address || typeof address !== 'object') throw new AppError('Shipping address is required', 400, 'VALIDATION_ERROR')
  const fields = ['line1', 'city', 'state', 'postalCode', 'country']
  const snapshot = Object.fromEntries(fields.map((field) => [field, typeof address[field] === 'string' ? address[field].trim() : '']))
  if (Object.values(snapshot).some((value) => !value)) throw new AppError('Complete shipping address is required', 400, 'VALIDATION_ERROR')
  return snapshot
}

export async function placeOrder({ userId, shippingAddress, paymentMethod = 'cod' }) {
  if (paymentMethod !== 'cod') throw new AppError('Only cash on delivery is available', 400, 'INVALID_PAYMENT_METHOD')
  const addressSnapshot = normalizeAddress(shippingAddress)
  const session = await mongoose.startSession()
  let createdOrder
  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: userId }).session(session)
      if (!cart || cart.items.length === 0) throw new AppError('Cart is empty', 400, 'EMPTY_CART')

      const quantities = new Map()
      for (const item of cart.items) quantities.set(item.product.toString(), (quantities.get(item.product.toString()) || 0) + item.quantity)
      const orderProducts = []
      let totalAmount = 0

      for (const [productId, quantity] of quantities) {
        const product = await Product.findById(productId).session(session)
        if (!product) throw new AppError('A cart product is no longer available', 409, 'PRODUCT_UNAVAILABLE')
        const deduction = await Product.updateOne({ _id: product._id, stock: { $gte: quantity } }, { $inc: { stock: -quantity, popularity: quantity } }, { session })
        if (deduction.modifiedCount !== 1) throw new AppError(`Insufficient stock for ${product.name}`, 409, 'INSUFFICIENT_STOCK')
        const lineTotal = product.price * quantity
        totalAmount += lineTotal
        orderProducts.push({ product: product._id, name: product.name, price: product.price, quantity })
      }

      const [order] = await Order.create([{
        user: userId,
        products: orderProducts,
        totalAmount,
        shippingAddress: addressSnapshot,
        paymentMethod: 'cod',
        orderStatus: 'Processing',
        paymentStatus: 'Pending',
      }], { session })
      await Cart.updateOne({ user: userId }, { $set: { items: [] } }, { session })
      createdOrder = order
    })
    return Order.findById(createdOrder._id).populate('products.product', 'name image').lean()
  } finally {
    await session.endSession()
  }
}

export async function cancelOrder({ orderId, userId, isAdmin, reason }) {
  const session = await mongoose.startSession()
  let cancelledOrder
  try {
    await session.withTransaction(async () => {
      const ownerFilter = isAdmin ? { _id: orderId } : { _id: orderId, user: userId }
      const order = await Order.findOneAndUpdate(
        { ...ownerFilter, orderStatus: { $in: allowedCancellationStatuses }, inventoryRestoredAt: { $exists: false } },
        { $set: { orderStatus: 'Cancelled', cancelledAt: new Date(), cancellationReason: reason?.trim() || undefined } },
        { new: true, session },
      )
      if (!order) throw new AppError('Order cannot be cancelled in its current state', 409, 'CANCELLATION_NOT_ALLOWED')
      for (const item of order.products) {
        const restoration = await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session })
        if (restoration.matchedCount !== 1) throw new AppError('Unable to restore order inventory', 409, 'INVENTORY_RESTORE_FAILED')
      }
      order.inventoryRestoredAt = new Date()
      await order.save({ session })
      cancelledOrder = order
    })
    return Order.findById(cancelledOrder._id).populate('products.product', 'name image').lean()
  } finally {
    await session.endSession()
  }
}