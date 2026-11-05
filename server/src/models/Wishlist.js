import mongoose from 'mongoose'

const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true, versionKey: false })

export const Wishlist = mongoose.model('Wishlist', wishlistSchema)
