import { Router } from 'express'
import { ok, err } from '../utils/http.js'
import { getForecast } from '../services/NEAService.js'
import { geocodeLocation } from '../services/WeatherService.js'
const r = Router()
r.get('/current', async (req, res) => {
try {
const location = req.query.location as string | undefined
let lat: number
let lng: number
if (location && location.trim().length > 0) {
  const coords = await geocodeLocation(location)
  lat = coords.lat
  lng = coords.lng
} else {
  lat = parseFloat(req.query.lat as string)
  lng = parseFloat(req.query.lng as string)
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json(err('lat/lng required'))
}
const data = await getForecast(lat, lng)
res.json(ok(data))
} catch (e:any) { res.status(400).json(err(e.message)) }
})
export default r
