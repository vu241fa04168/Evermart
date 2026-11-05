import assert from 'node:assert/strict'
import { before, after, beforeEach, describe, it } from 'node:test'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import request from 'supertest'
import { app } from '../src/app.js'
import { User } from '../src/models/User.js'
import { Category } from '../src/models/Category.js'
import { Product } from '../src/models/Product.js'
import { Order } from '../src/models/Order.js'
import { Review } from '../src/models/Review.js'

const uri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/fieldnote_phase2_test?replicaSet=rs0'
const customerPassword = 'customer-password-123'
let admin
let customer
let category

async function makeUser(name, email, role = 'customer') {
  return User.create({ name, email, role, password: await bcrypt.hash(role === 'admin' ? 'admin-password-123' : customerPassword, 12) })
}
async function login(email, password = customerPassword) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password }).expect(200)
  return agent
}

before(async () => { await mongoose.connect(uri) })
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})])
  admin = await makeUser('Administrator', 'admin@dashboard.test', 'admin')
  customer = await makeUser('Customer', 'customer@dashboard.test')
  category = await Category.create({ name: 'Dashboard Goods', slug: 'dashboard-goods' })
})
after(async () => { await mongoose.connection.dropDatabase(); await mongoose.connection.close() })

describe('Admin API', () => {
  it('rejects customer access and returns real dashboard aggregates', async () => {
    const customerAgent = await login(customer.email)
    await customerAgent.get('/api/admin/dashboard').expect(403)
    const adminAgent = await login(admin.email, 'admin-password-123')
    const lowStock = await Product.create({ name: 'Low Stock Item', description: 'An item with limited inventory for dashboard checks.', price: 20, category: category._id, image: 'https://example.com/low.jpg', stock: 3 })
    const delivered = await Order.create({ user: customer._id, products: [{ product: lowStock._id, name: lowStock.name, price: 20, quantity: 2 }], totalAmount: 40, shippingAddress: { line1: '1 Main', city: 'Portland', state: 'Oregon', postalCode: '97201', country: 'USA' }, orderStatus: 'Delivered', paymentStatus: 'Pending' })
    const response = await adminAgent.get('/api/admin/dashboard').expect(200)
    assert.equal(response.body.stats.products, 1)
    assert.equal(response.body.stats.customers, 1)
    assert.equal(response.body.stats.orders, 1)
    assert.equal(response.body.stats.revenue, 40)
    assert.equal(response.body.lowStockProducts[0]._id, lowStock.id)
    assert.equal(response.body.recentOrders[0]._id, delivered.id)
  })

  it('supports paginated product, order, category, and customer management without password data', async () => {
    const adminAgent = await login(admin.email, 'admin-password-123')
    const product = await Product.create({ name: 'Managed Product', description: 'A manageable product for admin table checks.', price: 35, category: category._id, image: 'https://example.com/managed.jpg', stock: 9 })
    await Order.create({ user: customer._id, products: [{ product: product._id, name: product.name, price: 35, quantity: 1 }], totalAmount: 35, shippingAddress: { line1: '2 Main', city: 'Portland', state: 'Oregon', postalCode: '97201', country: 'USA' }, orderStatus: 'Processing', paymentStatus: 'Pending' })
    const products = await adminAgent.get('/api/admin/products?page=1&limit=1&search=managed').expect(200)
    const orders = await adminAgent.get('/api/admin/orders?page=1&limit=1&status=Processing&search=customer%40dashboard.test').expect(200)
    const categories = await adminAgent.get('/api/admin/categories?page=1&limit=1').expect(200)
    const users = await adminAgent.get('/api/admin/users?page=1&limit=1&search=customer').expect(200)
    const details = await adminAgent.get(`/api/admin/users/${customer._id}`).expect(200)
    assert.equal(products.body.pagination.total, 1)
    assert.equal(orders.body.pagination.total, 1)
    assert.equal(categories.body.pagination.total, 1)
    assert.equal(users.body.pagination.total, 1)
    assert.equal(users.body.users[0].password, undefined)
    assert.equal(details.body.user.password, undefined)
    assert.equal(details.body.orders.length, 1)
  })

  it('searches products by id/category, manages thresholds, and updates COD payment separately', async () => {
    const adminAgent = await login(admin.email, 'admin-password-123')
    const product = await Product.create({ name: 'Threshold Product', description: 'A product for configurable stock threshold testing.', price: 35, category: category._id, image: 'https://example.com/threshold.jpg', stock: 12, lowStockThreshold: 15 })
    const dashboard = await adminAgent.get('/api/admin/dashboard').expect(200)
    assert.equal(dashboard.body.lowStockProducts.some((item) => item._id === product.id), true)
    const productSearch = await adminAgent.get(`/api/admin/products?search=${product.id}&limit=10`).expect(200)
    assert.equal(productSearch.body.pagination.total, 1)
    const categorySearch = await adminAgent.get(`/api/admin/products?search=${encodeURIComponent(category.name)}&limit=10`).expect(200)
    assert.equal(categorySearch.body.pagination.total, 1)
    await adminAgent.patch(`/api/products/${product.id}`).send({ lowStockThreshold: 5 }).expect(200)
    const afterThreshold = await adminAgent.get('/api/admin/dashboard').expect(200)
    assert.equal(afterThreshold.body.lowStockProducts.some((item) => item._id === product.id), false)

    const order = await Order.create({ user: customer._id, products: [{ product: product._id, name: product.name, price: product.price, quantity: 1 }], totalAmount: 35, shippingAddress: { line1: '3 Main', city: 'Portland', state: 'Oregon', postalCode: '97201', country: 'USA' }, orderStatus: 'Delivered', paymentStatus: 'Pending' })
    await adminAgent.patch(`/api/orders/${order.id}/payment`).send({ paymentStatus: 'Paid' }).expect(200)
    assert.equal((await Order.findById(order.id)).paymentStatus, 'Paid')
    await adminAgent.patch(`/api/orders/${order.id}/status`).send({ orderStatus: 'Delivered' }).expect(409)
  })

  it('deletes reviews as an admin and recalculates product aggregates', async () => {
    const adminAgent = await login(admin.email, 'admin-password-123')
    const product = await Product.create({ name: 'Review Product', description: 'A product for review moderation testing.', price: 25, category: category._id, image: 'https://example.com/review.jpg', stock: 5 })
    const order = await Order.create({ user: customer._id, products: [{ product: product._id, name: product.name, price: 25, quantity: 1 }], totalAmount: 25, shippingAddress: { line1: '4 Main', city: 'Portland', state: 'Oregon', postalCode: '97201', country: 'USA' }, orderStatus: 'Delivered', paymentStatus: 'Pending' })
    const review = await Review.create({ user: customer._id, product: product._id, order: order._id, rating: 5, comment: 'A useful and well-finished product.' })
    await Product.updateOne({ _id: product._id }, { $set: { rating: 5, reviewCount: 1 } })
    const list = await adminAgent.get('/api/admin/reviews?search=Review%20Product').expect(200)
    assert.equal(list.body.pagination.total, 1)
    await adminAgent.delete(`/api/admin/reviews/${review.id}`).expect(204)
    const refreshedProduct = await Product.findById(product.id)
    assert.equal(refreshedProduct.rating, 0)
    assert.equal(refreshedProduct.reviewCount, 0)
    assert.equal(await Review.countDocuments({ _id: review.id }), 0)
  })
})
