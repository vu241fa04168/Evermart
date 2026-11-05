import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 60 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  description: { type: String, trim: true, maxlength: 240 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false })

export const Category = mongoose.model('Category', categorySchema)
