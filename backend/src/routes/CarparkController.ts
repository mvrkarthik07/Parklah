import { Router } from 'express'
import { ok, err } from '../utils/http'
import { geocode } from '../adapters/GeocoderOneMap'
import { search } from '../services/CarparkService'

const r = Router()

// GET /carparks/search?q=choa+chu+kang&radius=4000&type=multi&maxDistance=2500&includeText=1
r.get('/search', async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').trim()
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radius = parseInt((req.query.radius as string) || '3000', 10)

    // new: optional stricter text filter toggle
    const includeText = (req.query.includeText as string) === '1' // if on, filter by name/address contains q
    const type = ((req.query.type as string) || '').toLowerCase().trim()
    const maxDistance = parseInt((req.query.maxDistance as string) || '') || 0

    let center: { lat:number; lng:number }
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      center = { lat, lng }
    } else if (q) {
      const g = await geocode(q)
      center = { lat: g.lat, lng: g.lng }
    } else {
      return res.status(400).json(err('Provide q or lat/lng'))
    }

    // vehicle defaults (you can wire real profile later)
    const vehicle = { type: 'CAR', height: 1.6 }

    let carparks = await search(center, radius, vehicle)

    // optional: filter by carpark type (from CSV metadata)
    if (type) {
      carparks = carparks.filter((c: any) => {
        const t = (c.carparkType || '').toLowerCase()
        if (type === 'multi' || type === 'multi-storey') return t.includes('multi')
        if (type === 'basement') return t.includes('basement')
        if (type === 'surface' || type === 'open') return t.includes('surface') || t.includes('open')
        return t.includes(type)
      })
    }

    // optional: stricter text filtering using q (name/address contains)
    if (includeText && q.length >= 3) {
      const needle = q.toLowerCase()
      carparks = carparks.filter(c =>
        (c.name?.toLowerCase().includes(needle)) ||
        (c.address?.toLowerCase().includes(needle))
      )
    }

    if (maxDistance > 0) {
      carparks = carparks.filter(c => (c.distanceM ?? Infinity) <= maxDistance)
    }

    res.json(ok({ center, carparks, lotKey: 'C' }))
  } catch (e:any) {
    res.status(400).json(err(e.message))
  }
})

export default r
