import { Router } from 'express'
import { authGuard } from '../middlewares/authGuard'
import { getVehicle, setVehicle, listFavorites, addFavorite, delFavorite } from
'../services/UserService'
import { ok } from '../utils/http'
const r = Router()
r.use(authGuard)
r.get('/vehicle', async (req, res) => {
const uid = (req as any).user.uid
res.json(ok(await getVehicle(uid)))
})
r.put('/vehicle', async (req, res) => {
const uid = (req as any).user.uid
const { vehicleType, vehicleHeight } = req.body
res.json(ok(await setVehicle(uid, vehicleType, vehicleHeight)))
})
r.get('/favorites', async (req, res) => {
const uid = (req as any).user.uid
res.json(ok(await listFavorites(uid)))
})
r.post('/favorites', async (req, res) => {
const uid = (req as any).user.uid
const { carparkId, label } = req.body
res.json(ok(await addFavorite(uid, carparkId, label)))
})
r.delete('/favorites/:id', async (req, res) => {
res.json(ok(await delFavorite(req.params.id)))
})
export default r
