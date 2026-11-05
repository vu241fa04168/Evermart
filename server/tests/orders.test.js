import assert from 'node:assert/strict'
import { before, after, beforeEach, describe, it } from 'node:test'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import request from 'supertest'
import { app } from '../src/app.js'
import { User } from '../src/models/User.js'
import { Category } from '../src/models/Category.js'
import { Product } from '../src/models/Product.js'
import { Cart } from '../src/models/Cart.js'
import { Wishlist } from '../src/models/Wishlist.js'
import { Order } from '../src/models/Order.js'
import { Review } from '../src/models/Review.js'

const uri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/fieldnote_phase3_test?replicaSet=rs0'
const customerPassword = 'customer-password-123'
let admin
let category

async function createUser(name, email, role = 'customer') {
  return User.create({ name, email, role, password: await bcrypt.hash(role === 'admin' ? 'admin-password-123' : customerPassword, 12) })
}

async function login(email, password = customerPassword) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password }).expect(200)
  return agent
}

async function createProduct(stock = 3, price = 25) {
  return Product.create({ name: 'Transaction Product', description: 'A product used for transaction integration tests.', price, category: category._id, image: 'https://example.com/product.jpg', stock })
}

async function addToCart(agent, product, quantity) {
  await agent.put(`/api/cart/items/${product._id}`).send({ quantity }).expect(200)
}

const address = { line1: '1 Market Street', city: 'Portland', state: 'Oregon', postalCode: '97201', country: 'USA' }

before(async () => { await mongoose.connect(uri) })
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}), Cart.deleteMany({}), Wishlist.deleteMany({}), Order.deleteMany({}), Review.deleteMany({})])
  admin = await createUser('Admin', 'admin@phase3.test', 'admin')
  category = await Category.create({ name: 'Phase Three Goods', slug: 'phase-three-goods' })
})
after(async () => { await mongoose.connection.dropDatabase(); await mongoose.connection.close() })

describe('Phase 3 orders and reviews', () => {
  it('creates a COD order transactionally using current prices and clears the persistent cart', async () => {
    const user = await createUser('Buyer', 'buyer@phase3.test')
    const agent = await login(user.email)
    const product = await createProduct(3, 25)
    await addToCart(agent, product, 2)
    await Product.updateOne({ _id: product._id }, { $set: { price: 30 } })

    const response = await agent.post('/api/orders').send({ totalAmount: 1, paymentMethod: 'cod', shippingAddress: address }).expect(201)
    assert.equal(response.body.order.totalAmount, 60)
    assert.equal(response.body.order.products[0].price, 30)
    assert.equal(response.body.order.orderStatus, 'Processing')
    assert.equal(response.body.order.paymentStatus, 'Pending')
    assert.deepEqual(response.body.order.shippingAddress, address)
    assert.equal((await Product.findById(product._id)).stock, 1)
    assert.equal((await Cart.findOne({ user: user._id })).items.length, 0)
  })

  it('allows only one of two concurrent checkouts to consume the final unit', async () => {
    const firstUser = await createUser('First Buyer', 'first@phase3.test')
    const secondUser = await createUser('Second Buyer', 'second@phase3.test')
    const firstAgent = await login(firstUser.email)
    const secondAgent = await login(secondUser.email)
    const product = await createProduct(1, 10)
    await addToCart(firstAgent, product, 1)
    await addToCart(secondAgent, product, 1)

    const results = await Promise.all([
      firstAgent.post('/api/orders').send({ shippingAddress: address, paymentMethod: 'cod' }),
      secondAgent.post('/api/orders').send({ shippingAddress: address, paymentMethod: 'cod' }),
    ])
    const statuses = results.map((result) => result.status).sort()
    assert.deepEqual(statuses, [201, 409])
    assert.equal((await Product.findById(product._id)).stock, 0)
    assert.equal(await Order.countDocuments({}), 1)
  })

  it('restores cancelled inventory exactly once and rejects cancellation after shipping', async () => {
    const user = await createUser('Cancellation Buyer', 'cancel@phase3.test')
    const agent = await login(user.email)
    const product = await createProduct(4, 20)
    await addToCart(agent, product, 2)
    const created = await agent.post('/api/orders').send({ shippingAddress: address }).expect(201)
    assert.equal((await Product.findById(product._id)).stock, 2)

    const cancelled = await agent.post(`/api/orders/${created.body.order._id}/cancel`).send({ reason: 'Changed my mind' }).expect(200)
    assert.equal(cancelled.body.order.orderStatus, 'Cancelled')
    assert.ok(cancelled.body.order.inventoryRestoredAt)
    assert.equal((await Product.findById(product._id)).stock, 4)
    await agent.post(`/api/orders/${created.body.order._id}/cancel`).expect(409)
    assert.equal((await Product.findById(product._id)).stock, 4)

    await addToCart(agent, product, 1)
    const shippedOrder = await agent.post('/api/orders').send({ shippingAddress: address }).expect(201)
    const adminAgent = await login(admin.email, 'admin-password-123')
    await adminAgent.patch(`/api/orders/${shippedOrder.body.order._id}/status`).send({ orderStatus: 'Shipped' }).expect(200)
    await agent.post(`/api/orders/${shippedOrder.body.order._id}/cancel`).expect(409)
    assert.equal((await Product.findById(product._id)).stock, 3)
    await adminAgent.patch(`/api/orders/${shippedOrder.body.order._id}/status`).send({ orderStatus: 'Cancelled' }).expect(409)
    await addToCart(agent, product, 1)
    const processingOrder = await agent.post('/api/orders').send({ shippingAddress: address }).expect(201)
    await agent.post(`/api/orders/${processingOrder.body.order._id}/cancel`).expect(200)
    await adminAgent.patch(`/api/orders/${processingOrder.body.order._id}/status`).send({ orderStatus: 'Processing' }).expect(409)
  })

  it('allows only one concurrent cancellation to restore inventory', async () => {
    const user = await createUser('Concurrent Canceller', 'concurrent-cancel@phase3.test')
    const agent = await login(user.email)
    const product = await createProduct(3, 20)
    await addToCart(agent, product, 2)
    const created = await agent.post('/api/orders').send({ shippingAddress: address }).expect(201)
    const responses = await Promise.all([
      agent.post(`/api/orders/${created.body.order._id}/cancel`),
      agent.post(`/api/orders/${created.body.order._id}/cancel`),
    ])
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409])
    assert.equal((await Product.findById(product._id)).stock, 3)
    assert.equal(await Order.countDocuments({ orderStatus: 'Cancelled' }), 1)
  })

  it('requires a delivered purchase for one review and recalculates persisted aggregates', async () => {
    const user = await createUser('Reviewer', 'reviewer@phase3.test')
    const otherUser = await createUser('Other Buyer', 'other@phase3.test')
    const agent = await login(user.email)
    const otherAgent = await login(otherUser.email)
    const adminAgent = await login(admin.email, 'admin-password-123')
    const product = await createProduct(3, 18)
    await addToCart(agent, product, 1)
    const order = await agent.post('/api/orders').send({ shippingAddress: address }).expect(201)

    await agent.post(`/api/products/${product._id}/reviews`).send({ orderId: order.body.order._id, rating: 5, comment: 'Excellent everyday quality.' }).expect(403)
    await adminAgent.patch(`/api/orders/${order.body.order._id}/status`).send({ orderStatus: 'Delivered' }).expect(200)
    const review = await agent.post(`/api/products/${product._id}/reviews`).send({ orderId: order.body.order._id, rating: 5, comment: 'Excellent everyday quality.' }).expect(201)
    assert.equal(review.body.review.rating, 5)
    await agent.post(`/api/products/${product._id}/reviews`).send({ orderId: order.body.order._id, rating: 4, comment: 'A duplicate review.' }).expect(409)
    await otherAgent.post(`/api/products/${product._id}/reviews`).send({ orderId: order.body.order._id, rating: 1, comment: 'Not my purchase.' }).expect(403)
    const productAfterReview = await Product.findById(product._id)
    assert.equal(productAfterReview.rating, 5)
    assert.equal(productAfterReview.reviewCount, 1)
    assert.equal(await Review.countDocuments({ product: product._id }), 1)
  })

  it('prevents concurrent duplicate reviews and rejects reviews on cancelled orders', async () => {
    const user = await createUser('Concurrent Reviewer', 'concurrent-review@phase3.test')
    const agent = await login(user.email)
    const adminAgent = await login(admin.email, 'admin-password-123')
    const product = await createProduct(3, 15)
    await addToCart(agent, product, 1)
    const created = await agent.post('/api/orders').send({ shippingAddress: address }).expect(201)
    await adminAgent.patch(`/api/orders/${created.body.order._id}/status`).send({ orderStatus: 'Delivered' }).expect(200)
    const reviewPayload = { orderId: created.body.order._id, rating: 4, comment: 'Reliable and well made.' }
    const responses = await Promise.all([
      agent.post(`/api/products/${product._id}/reviews`).send(reviewPayload),
      agent.post(`/api/products/${product._id}/reviews`).send(reviewPayload),
    ])
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409])
    assert.equal(await Review.countDocuments({ product: product._id }), 1)

    const cancelledProduct = await createProduct(2, 12)
    await addToCart(agent, cancelledProduct, 1)
    const cancelledOrder = await agent.post('/api/orders').send({ shippingAddress: address }).expect(201)
    await agent.post(`/api/orders/${cancelledOrder.body.order._id}/cancel`).expect(200)
    await agent.post(`/api/products/${cancelledProduct._id}/reviews`).send({ orderId: cancelledOrder.body.order._id, rating: 5, comment: 'This must be rejected.' }).expect(403)
  })

  it('rolls back stock, cart, and order creation when the order write fails', async () => {
    const user = await createUser('Rollback Buyer', 'rollback@phase3.test')
    const agent = await login(user.email)
    const product = await createProduct(2, 22)
    await addToCart(agent, product, 1)
    const originalCreate = Order.create
    Order.create = async () => { throw new Error('forced order write failure') }
    try {
      await agent.post('/api/orders').send({ shippingAddress: address }).expect(500)
    } finally {
      Order.create = originalCreate
    }
    assert.equal((await Product.findById(product._id)).stock, 2)
    assert.equal((await Cart.findOne({ user: user._id })).items.length, 1)
    assert.equal(await Order.countDocuments({ user: user._id }), 0)
  })
})
