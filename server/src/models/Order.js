import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  shippingAddress: { type: mongoose.Schema.Types.Mixed, required: true },
  paymentMethod: { type: String, enum: ['cod'], default: 'cod' },
  orderStatus: { type: String, enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Processing', index: true },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
  cancelledAt: Date,
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  inventoryRestoredAt: Date,
}, { timestamps: true, versionKey: false })

export const Order = mongoose.model('Order', orderSchema)
