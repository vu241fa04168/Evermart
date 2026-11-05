import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'

const catalog = [
  {
    name: 'Desk Essentials',
    slug: 'desk-essentials',
    description: 'Quietly useful objects for a focused workspace.',
    products: [
      { name: 'Oak Desk Tray', description: 'A solid oak catchall for keys, pens, and small daily tools.', price: 42, stock: 18, image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Linen Bound Journal', description: 'A durable linen-covered journal with thick paper for notes and sketches.', price: 24, stock: 34, image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Brass Task Lamp', description: 'A compact adjustable lamp with a warm, focused light for late work.', price: 86, stock: 12, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85' },
    ],
  },
  {
    name: 'Home Rituals',
    slug: 'home-rituals',
    description: 'Materials and forms that make ordinary routines feel considered.',
    products: [
      { name: 'Stoneware Pour-Over Set', description: 'A balanced ceramic brewer and matching cup for a measured morning pour.', price: 58, stock: 16, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Woven Cotton Throw', description: 'A breathable cotton throw with a simple texture for a sofa or reading chair.', price: 74, stock: 10, image: 'https://images.unsplash.com/photo-1583845112203-454c5a5a9a8b?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Hand Turned Oak Bowl', description: 'A small hand-finished bowl for fruit, flour, or the things that gather on a table.', price: 36, stock: 21, image: 'https://images.unsplash.com/photo-1603204077779-bed963ea7d0e?auto=format&fit=crop&w=1200&q=85' },
    ],
  },
  {
    name: 'Carry Well',
    slug: 'carry-well',
    description: 'Reliable companions for commutes, errands, and time outdoors.',
    products: [
      { name: 'Waxed Canvas Tote', description: 'A structured everyday tote with reinforced handles and a broad base.', price: 68, stock: 14, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Recycled Wool Cap', description: 'A soft wool cap with a low profile and an easy adjustable fit.', price: 32, stock: 26, image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1200&q=85' },
    ],
  },
]

try {
  await connectDatabase()
  let categoryCount = 0
  let productCount = 0
  for (const entry of catalog) {
    const category = await Category.findOneAndUpdate(
      { slug: entry.slug },
      { $set: { name: entry.name, description: entry.description, isActive: true }, $setOnInsert: { slug: entry.slug } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    )
    categoryCount += 1
    for (const product of entry.products) {
      await Product.findOneAndUpdate(
        { name: product.name, category: category._id },
        { $set: { ...product, category: category._id, isActive: true }, $setOnInsert: { rating: 0, reviewCount: 0, popularity: 0 } },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
      )
      productCount += 1
    }
  }
  console.log(`Catalog seed complete: ${categoryCount} categories, ${productCount} products`)
} catch (error) {
  console.error('Catalog seed failed:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.connection.close()
}