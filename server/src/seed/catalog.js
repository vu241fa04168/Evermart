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
      { name: 'Leather Desk Mat', description: 'A supple vegetable-tanned surface that gives a desk a calm, protected foundation.', price: 64, stock: 15, image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Ceramic Pen Cup', description: 'A hand-finished stoneware cup for pens, brushes, and the tools used every day.', price: 28, stock: 24, image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Graphite Desk Clock', description: 'A quiet analog clock with a clean face and a weighted base.', price: 52, stock: 11, image: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Recycled Felt Organizer', description: 'A structured felt tray for cables, chargers, and small workday essentials.', price: 31, stock: 20, image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85' },
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
      { name: 'Linen Kitchen Apron', description: 'A durable cross-back apron cut from breathable linen for unhurried cooking.', price: 49, stock: 17, image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Amber Glass Carafe', description: 'A balanced glass carafe for water, iced tea, or a simple table centerpiece.', price: 44, stock: 13, image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Wool Felt Coasters', description: 'A set of four dense wool coasters that protect surfaces with quiet texture.', price: 22, stock: 30, image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Cotton Market Towel', description: 'A soft, absorbent cotton towel with a simple woven stripe for kitchen use.', price: 18, stock: 40, image: 'https://images.unsplash.com/photo-1583845112203-454c5a5a9a8b?auto=format&fit=crop&w=1200&q=85' },
    ],
  },
  {
    name: 'Carry Well',
    slug: 'carry-well',
    description: 'Reliable companions for commutes, errands, and time outdoors.',
    products: [
      { name: 'Waxed Canvas Tote', description: 'A structured everyday tote with reinforced handles and a broad base.', price: 68, stock: 14, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Recycled Wool Cap', description: 'A soft wool cap with a low profile and an easy adjustable fit.', price: 32, stock: 26, image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Leather Passport Sleeve', description: 'A slim vegetable-tanned sleeve for a passport and the cards needed on the way.', price: 46, stock: 19, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Travel Water Bottle', description: 'A durable insulated bottle sized for a commute, day trip, or long train ride.', price: 38, stock: 23, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Canvas Packing Pouch', description: 'A compact zip pouch for cables, toiletries, or the small things that travel loose.', price: 26, stock: 28, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85' },
      { name: 'Everyday Wool Scarf', description: 'A lightweight wool scarf with a soft hand and an understated neutral weave.', price: 62, stock: 9, image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=1200&q=85' },
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