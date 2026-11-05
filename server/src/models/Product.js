import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 140, index: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
  price: { type: Number, required: true, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  image: { type: String, required: true, trim: true, maxlength: 1000 },
  stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  lowStockThreshold: { type: Number, min: 0, max: 100000, default: 5, validate: Number.isInteger },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  popularity: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false })

productSchema.index({ name: 'text', description: 'text' })
productSchema.index({ price: 1, rating: -1, popularity: -1 })

export const Product = mongoose.model('Product', productSchema)
