import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDatabase() {
  await mongoose.connect(env.mongoUri)
  console.log('MongoDB connected')
}

export function databaseState() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
}