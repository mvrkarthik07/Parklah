import { Router } from 'express'
import { ok, err } from '../utils/http'
import { getForecast } from '../services/NEAService'
const r = Router()
r.get('/current', async (req, res) => {
try {
const lat = parseFloat(req.query.lat as string)

const lng = parseFloat(req.query.lng as string)
if (isNaN(lat) || isNaN(lng)) return res.status(400).json(err('lat/lngrequired'))
const data = await getForecast(lat, lng)
res.json(ok(data))
} catch (e:any) { res.status(400).json(err(e.message)) }
})
export default r
