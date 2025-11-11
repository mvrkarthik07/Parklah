import { createServer } from './server.js'
import { env } from './config/env.js'

const app = createServer()
const port = env.PORT || parseInt(process.env.PORT || '8080', 10)
console.log(`[API] PORT from env: ${process.env.PORT}`)
console.log(`[API] Using port: ${port}`)
app.listen(port, '0.0.0.0', () => {
  console.log(`[API] listening on 0.0.0.0:${port}`)
})
