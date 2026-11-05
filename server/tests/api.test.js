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

const uri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/fieldnote_phase2_test?replicaSet=rs0'
const password = 'customer-password-123'
let admin
let category
let customerAgent

before(async () => {
  await mongoose.connect(uri)
})

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}), Cart.deleteMany({}), Wishlist.deleteMany({})])
  admin = await User.create({ name: 'Admin', email: 'admin@test.example', password: await bcrypt.hash('admin-password-123', 12), role: 'admin' })
  category = await Category.create({ name: 'Desk Goods', slug: 'desk-goods' })
  customerAgent = request.agent(app)
})

after(async () => { await mongoose.connection.dropDatabase(); await mongoose.connection.close() })

describe('Phase 2 API', () => {
  it('registers customers, sets an HTTP-only cookie, and never accepts a public admin role', async () => {
    const response = await customerAgent.post('/api/auth/register').send({ name: 'Customer', email: 'customer@test.example', password, role: 'admin' }).expect(201)
    assert.equal(response.body.user.role, 'customer')
    assert.match(response.headers['set-cookie'][0], /HttpOnly/i)
    assert.match(response.headers['set-cookie'][0], /Path=\//i)
    assert.match(response.headers['set-cookie'][0], /SameSite=Lax/i)
    assert.equal((await User.findOne({ email: 'customer@test.example' })).role, 'customer')
    await customerAgent.get('/api/auth/me').expect(200)
    await customerAgent.post('/api/auth/logout').expect(204)
    await customerAgent.get('/api/auth/me').expect(401)
  })

  it('denies customer access to admin product operations', async () => {
    await customerAgent.post('/api/auth/register').send({ name: 'Customer', email: 'customer@test.example', password }).expect(201)
    await customerAgent.post('/api/products').send({ name: 'Blocked', description: 'This should not be created', price: 10, category: category.id, image: 'https://example.com/image.jpg', stock: 2 }).expect(403)
  })

  it('supports admin category and product CRUD with validation', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email: admin.email, password: 'admin-password-123' }).expect(200)
    const createdCategory = await agent.post('/api/categories').send({ name: 'Kitchen Objects', description: 'Useful objects for the kitchen.' }).expect(201)
    const categoryUpdate = await agent.patch(`/api/categories/${createdCategory.body.category._id}`).send({ name: 'Kitchen Tools' }).expect(200)
    assert.equal(categoryUpdate.body.category.slug, 'kitchen-tools')
    const categoryList = await agent.get('/api/categories/admin?page=1&limit=1').expect(200)
    assert.equal(categoryList.body.pagination.total, 2)
    await agent.delete(`/api/categories/${createdCategory.body.category._id}`).expect(204)
    const productResponse = await agent.post('/api/products').send({ name: 'Oak Tray', description: 'A solid oak tray for daily desk rituals.', price: 42, category: category.id, image: 'https://example.com/oak-tray.jpg', stock: 8 }).expect(201)
    assert.equal(productResponse.body.product.stock, 8)
    const updated = await agent.patch(`/api/products/${productResponse.body.product._id}`).send({ price: 45, image: 'https://example.com/oak-tray-new.jpg' }).expect(200)
    assert.equal(updated.body.product.price, 45)
    await agent.delete(`/api/products/${productResponse.body.product._id}`).expect(204)
  })

  it('searches, sorts, filters, and paginates products', async () => {
    await Product.create([
      { name: 'Oak Tray', description: 'A solid oak tray for daily desk rituals.', price: 42, category: category.id, image: 'https://example.com/tray.jpg', stock: 8, popularity: 10 },
      { name: 'Linen Journal', description: 'A linen-bound journal for quiet notes.', price: 18, category: category.id, image: 'https://example.com/journal.jpg', stock: 20, popularity: 5 },
    ])
    const response = await request(app).get('/api/products?search=oak&page=1&limit=1&sort=priceDesc').expect(200)
    assert.equal(response.body.products.length, 1)
    assert.equal(response.body.products[0].name, 'Oak Tray')
    assert.equal(response.body.pagination.total, 1)
    await request(app).get('/api/products?page=0&limit=101').expect(400)
    await request(app).get('/api/products?page=nope').expect(400)
    await request(app).get('/api/products?minPrice=not-a-number').expect(400)
  })

  it('persists cart and wishlist data for an authenticated customer', async () => {
    await customerAgent.post('/api/auth/register').send({ name: 'Customer', email: 'customer@test.example', password }).expect(201)
    const product = await Product.create({ name: 'Field Pen', description: 'A balanced pen for everyday writing.', price: 12, category: category.id, image: 'https://example.com/pen.jpg', stock: 4 })
    const cart = await customerAgent.put(`/api/cart/items/${product.id}`).send({ quantity: 2 }).expect(200)
    assert.equal(cart.body.cart.items[0].quantity, 2)
    await Product.updateOne({ _id: product.id }, { $set: { price: 15 } })
    const currentCart = await customerAgent.get('/api/cart').expect(200)
    assert.equal(currentCart.body.cart.items[0].product.price, 15)
    const wishlist = await customerAgent.put(`/api/wishlist/${product.id}`).expect(200)
    assert.equal(wishlist.body.wishlist.products.length, 1)
    const duplicateWishlist = await customerAgent.put(`/api/wishlist/${product.id}`).expect(200)
    assert.equal(duplicateWishlist.body.wishlist.products.length, 1)
    const persistedCart = await customerAgent.get('/api/cart').expect(200)
    const persistedWishlist = await customerAgent.get('/api/wishlist').expect(200)
    assert.equal(persistedCart.body.cart.items.length, 1)
    assert.equal(persistedWishlist.body.wishlist.products.length, 1)
    await customerAgent.delete('/api/cart').expect(200)
    assert.equal((await customerAgent.get('/api/cart').expect(200)).body.cart.items.length, 0)
  })

  it('rejects invalid input and does not expose password fields', async () => {
    await customerAgent.post('/api/auth/register').send({ name: 'x', email: 'bad', password: 'short' }).expect(400)
    const response = await customerAgent.post('/api/auth/register').send({ name: 'Customer', email: 'customer@test.example', password }).expect(201)
    assert.equal(response.body.user.password, undefined)
    await customerAgent.post('/api/auth/login').send({ email: 'customer@test.example', password: 'wrong-password' }).expect(401)
  })

  it('does not accept fabricated rating or popularity values from product creation', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email: admin.email, password: 'admin-password-123' }).expect(200)
    const response = await agent.post('/api/products').send({ name: 'Honest Product', description: 'A product whose metrics begin at zero.', price: 20, category: category.id, image: 'https://example.com/honest.jpg', stock: 3, rating: 5, reviewCount: 900, popularity: 900 }).expect(201)
    assert.equal(response.body.product.rating, 0)
    assert.equal(response.body.product.reviewCount, 0)
    assert.equal(response.body.product.popularity, 0)
  })
})
