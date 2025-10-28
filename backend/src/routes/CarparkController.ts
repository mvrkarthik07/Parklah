import { Router } from 'express'
import { searchCarparks, searchCarparksByCoords } from '../services/CarparkService'
import { getAllMeta, nearestN } from '../adapters/HDBCarparkAdapter'
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

r.get('/debug/meta', (_req, res) => {
  const m = getAllMeta()
  res.json({ ok: true, count: m.length, sample: m.slice(0, 3) })
})

r.get('/debug/near', (req, res) => {
  const lat = parseFloat(String(req.query.lat))
  const lng = parseFloat(String(req.query.lng))
  const n = req.query.n ? parseInt(String(req.query.n), 10) : 20
  const list = nearestN({ lat, lng }, n)
  res.json({ ok: true, count: list.length, carparks: list })
})
r.get('/near', async (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat))
    const lng = parseFloat(String(req.query.lng))
    const radiusM = req.query.radiusM ? parseInt(String(req.query.radiusM), 10) : 3000
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
