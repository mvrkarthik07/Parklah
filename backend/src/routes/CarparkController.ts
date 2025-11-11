import { Router } from 'express'
import { searchCarparks, searchCarparksByCoords } from '../services/CarparkService.js'
import { getAllMeta, getAllAsCarparks, nearestN } from '../adapters/HDBCarparkAdapter.js'

const r = Router()

// --------------- TEXT SEARCH ---------------
r.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim()
    const radiusM = req.query.radiusM ? parseInt(String(req.query.radiusM), 10) : 8000
    if (!q) return res.status(400).json({ ok: false, error: 'Missing query' })

    const originLat = req.query.originLat ? parseFloat(String(req.query.originLat)) : undefined
    const originLng = req.query.originLng ? parseFloat(String(req.query.originLng)) : undefined
    const origin = Number.isFinite(originLat as number) && Number.isFinite(originLng as number)
      ? { lat: originLat as number, lng: originLng as number }
      : undefined

    const data = await searchCarparks(q, radiusM, 'C', origin)
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})

// --------------- NEARBY SEARCH (Locate Me) ---------------
r.get('/near', async (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat))
    const lng = parseFloat(String(req.query.lng))
    const radiusM = req.query.radiusM ? parseInt(String(req.query.radiusM), 10) : 15000
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: 'lat/lng required' })
    }
    const data = await searchCarparksByCoords({ lat, lng }, radiusM)
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})

// debug endpoints optional
r.get('/debug/meta', (_req, res) => {
  const m = getAllMeta()
  res.json({ ok: true, count: m.length, sample: m.slice(0, 3) })
})
r.get('/debug/byId', (req, res) => {
  const ids = String(req.query.id || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const m = getAllMeta()
  const found = m.filter((x) => ids.includes(x.id))
  res.json({ ok: true, count: found.length, items: found })
})

// --------------- ALL CARPARKS (CSV only) ---------------
r.get('/all', (_req, res) => {
  try {
    const carparks = getAllAsCarparks()
    const center = { lat: 1.3521, lng: 103.8198 }
    res.json({ ok: true, data: { center, carparks, meta: { count: carparks.length } } })
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})
r.get('/debug/near', (req, res) => {
  const lat = parseFloat(String(req.query.lat))
  const lng = parseFloat(String(req.query.lng))
  const n = req.query.n ? parseInt(String(req.query.n), 10) : 20
  const list = nearestN({ lat, lng }, n)
  res.json({ ok: true, count: list.length, carparks: list })
})

export default r
