import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import { env } from '../config/env.js'
import { User } from '../models/User.js'

if (!env.adminEmail || !env.adminPassword || env.adminPassword.length < 16) {
  console.error('ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters are required in server/.env')
  process.exit(1)
}

try {
  await connectDatabase()
  const email = env.adminEmail.trim().toLowerCase()
  const password = await bcrypt.hash(env.adminPassword, 12)
  await User.findOneAndUpdate(
    { email },
    { $set: { name: 'Fieldnote Administrator', email, password, role: 'admin' } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  )
  console.log(`Admin seed complete for ${email}`)
} catch (error) {
  console.error('Admin seed failed:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.connection.close()
}
