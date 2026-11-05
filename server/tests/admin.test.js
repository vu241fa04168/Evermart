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
})
