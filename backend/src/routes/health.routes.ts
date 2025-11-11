import { Router } from 'express'
const r = Router()
r.get('/', (_req, res) => {
  res.json({ 
    message: 'ParkLah API is running',
    endpoints: {
      health: '/healthz',
      auth: '/auth',
      carparks: '/carparks',
      weather: '/weather',
      user: '/user'
    }
  })
})
r.get('/healthz', (_req, res) => res.json({ ok: true }))
export default r