import { Router } from 'express'
import { register, login, me } from '../services/AuthService'
import { ok, err } from '../utils/http'
const r = Router()
r.post('/register', async (req, res) => {
try {
const { email, password, vehicleType, vehicleHeight } = req.body
const { user, token } = await register(email, password, vehicleType,
vehicleHeight)
res.cookie('access_token', token, { httpOnly: true, sameSite: 'strict',
secure: false })
res.json(ok({ id: user.id, email: user.email }))
} catch (e:any) { res.status(400).json(err(e.message)) }
28
})
r.post('/login', async (req, res) => {
try {
const { email, password } = req.body
const { user, token } = await login(email, password)
res.cookie('access_token', token, { httpOnly: true, sameSite: 'strict',
secure: false })
res.json(ok({ id: user.id, email: user.email, profile: user.profile }))
} catch (e:any) { res.status(400).json(err(e.message)) }
})
r.post('/logout', (req, res) => { res.clearCookie('access_token');
res.json(ok(true)) })
r.get('/me', async (req, res) => {
try {
const uid = (req as any).user?.uid
if (!uid) return res.status(401).json(err('unauth'))
const u = await me(uid)
res.json(ok(u))
} catch (e:any) { res.status(400).json(err(e.message)) }
})
export default r
