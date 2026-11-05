import { app } from './app.js'
import { connectDatabase } from './config/db.js'
import { env } from './config/env.js'

app.listen(env.port, () => console.log(`Fieldnote API listening on http://localhost:${env.port}`))

try {
  await connectDatabase()
} catch (error) {
  console.error('MongoDB unavailable. API health will report degraded:', error.message)
}