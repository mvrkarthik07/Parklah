import { Router } from 'express'
import { searchCarparks, searchCarparksByCoords } from '../services/CarparkService'

const r = Router()

// text search: /carparks/search?q=...
r.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q ?? '')
    const radiusM = req.query.radiusM ? parseInt(String(req.query.radiusM), 10) : 2000
    const data = await searchCarparks(q, radiusM)
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})

// coords search: /carparks/near?lat=...&lng=...
r.get('/near', async (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat))
    const lng = parseFloat(String(req.query.lng))
    const radiusM = req.query.radiusM ? parseInt(String(req.query.radiusM), 10) : 2000
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: 'lat/lng required' })
    }
    const data = await searchCarparksByCoords({ lat, lng }, radiusM)
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})

export default r
