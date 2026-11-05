import 'dotenv/config'

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const clientUrl = process.env.CLIENT_URL || (isProduction ? '' : 'http://localhost:5173')
const mongoUri = process.env.MONGODB_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/fieldnote?replicaSet=rs0')
const jwtSecret = process.env.JWT_SECRET || ''

if (isProduction) {
  if (jwtSecret.length < 64) throw new Error('Production JWT_SECRET must be at least 64 characters')
  if (!/^https:\/\//i.test(clientUrl)) throw new Error('Production CLIENT_URL must use HTTPS')
  if (!mongoUri) throw new Error('Production MONGODB_URI is required')
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  clientUrl,
  mongoUri,
  jwtSecret,
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure: isProduction || process.env.COOKIE_SECURE === 'true',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
}