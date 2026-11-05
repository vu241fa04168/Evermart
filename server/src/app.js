import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { databaseState } from './config/db.js'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.js'
import { categoryRouter } from './routes/categories.js'
import { productRouter } from './routes/products.js'
import { cartRouter } from './routes/cart.js'
import { wishlistRouter } from './routes/wishlist.js'
import { orderRouter } from './routes/orders.js'
import { reviewRouter } from './routes/reviews.js'
import { adminRouter } from './routes/admin.js'
import { errorHandler } from './middleware/error.js'

export const app = express()

app.use(helmet())
app.use(cors({ origin: env.clientUrl, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.get('/api/health', (_request, response) => {
  const database = databaseState()
  response.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    service: 'fieldnote-api',
    database,
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/health/ping', (_request, response) => {
  response.json({ status: 'ok', service: 'fieldnote-api' })
})

app.use('/api/auth', authRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/products', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/wishlist', wishlistRouter)
app.use('/api/orders', orderRouter)
app.use('/api/products/:productId/reviews', reviewRouter)
app.use('/api/admin', adminRouter)

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found', code: 'NOT_FOUND' })
})

app.use(errorHandler)

export function closeDatabase() {
  return mongoose.connection.close()
}