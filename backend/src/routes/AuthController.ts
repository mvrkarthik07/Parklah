import { Router } from 'express'
import { VehicleType } from '@prisma/client'
import {
  register,
  login,
  me,
  verify2FA,
  setup2FA,
  enable2FA,
  disable2FA,
  getCurrent2FACode,
  requestPasswordReset,
  resetPassword,
} from '../services/AuthService.js'
import { ok, err } from '../utils/http.js'
import { authGuard } from '../middlewares/authGuard.js'
const r = Router()
r.post('/register', async (req, res) => {
try {
const { email, password, vehicleType, vehicleHeight, vehicleNumber, phoneNumber } = req.body
if (!email || !password) {
  return res.status(400).json(err('Email and password are required'))
}
if (password.length < 8) {
  return res.status(400).json(err('Password must be at least 8 characters'))
}
const type = String(vehicleType || '').toUpperCase() as VehicleType
if (!Object.values(VehicleType).includes(type)) {
  return res.status(400).json(err('Invalid vehicle type'))
}
const height = Number(vehicleHeight)
if (!Number.isFinite(height) || height <= 0) {
  return res.status(400).json(err('Invalid vehicle height'))
}
const { user, token } = await register(
  email.trim(),
  password,
  type,
  height,
  vehicleNumber || null,
  phoneNumber || null
)
res.cookie('access_token', token, { 
  httpOnly: true, 
  sameSite: 'none', 
  secure: true,
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 // 24 hours default
})
res.json(ok({ id: user.id, email: user.email }))
} catch (e:any) { 
  console.error('Registration error:', e)
  res.status(400).json(err(e.message || 'Registration failed')) 
}
})
r.post('/login', async (req, res) => {
try {
const { email, password, rememberMe } = req.body
if (!email || !password) {
  return res.status(400).json(err('Email and password are required'))
}
const remember = Boolean(rememberMe)
const result = await login(email.trim(), password)
if (result.requires2FA) {
  return res.json(ok({
    requires2FA: true,
    email: result.user.email,
    rememberMe: remember,
  }))
}
const cookieOptions: any = { 
  httpOnly: true, 
  sameSite: 'none', 
  secure: true,
  path: '/'
}
if (remember) {
  cookieOptions.maxAge = 1000 * 60 * 60 * 24 * 30 // 30 days
} else {
  cookieOptions.maxAge = 1000 * 60 * 60 * 24 // 24 hours
}
res.cookie('access_token', result.token, cookieOptions)
res.json(ok({ id: result.user.id, email: result.user.email, profile: result.user.profile, requires2FA: false }))
} catch (e:any) { 
  console.error('Login error:', e)
  res.status(400).json(err(e.message || 'Invalid email or password')) 
}
})

r.post('/verify-2fa', async (req, res) => {
try {
const { email, token, rememberMe } = req.body
const remember = Boolean(rememberMe)
const { user, token: jwtToken } = await verify2FA(email.trim(), token)
const cookieOptions: any = { 
  httpOnly: true, 
  sameSite: 'none', 
  secure: true,
  path: '/'
}
if (remember) {
  cookieOptions.maxAge = 1000 * 60 * 60 * 24 * 30
} else {
  cookieOptions.maxAge = 1000 * 60 * 60 * 24 // 24 hours
}
res.cookie('access_token', jwtToken, cookieOptions)
res.json(ok({ id: user.id, email: user.email, profile: user.profile }))
} catch (e:any) { res.status(400).json(err(e.message)) }
})

r.post('/request-reset', async (req, res) => {
try {
const { email } = req.body
const result = await requestPasswordReset(email)
res.json(ok(result))
} catch (e:any) { res.status(400).json(err(e.message)) }
})

r.post('/reset-password', async (req, res) => {
try {
const { email, token, password } = req.body
if (!password || password.length < 8) {
  throw new Error('Password must be at least 8 characters long')
}
const result = await resetPassword(email, token, password)
res.json(ok(result))
} catch (e:any) { res.status(400).json(err(e.message)) }
})

r.get('/setup-2fa', authGuard, async (req, res) => {
try {
const uid = (req as any).user?.uid
if (!uid) return res.status(401).json(err('unauth'))
const { secret, qrCodeUrl } = await setup2FA(uid)
res.json(ok({ secret, qrCodeUrl }))
} catch (e:any) { res.status(400).json(err(e.message)) }
})

r.post('/enable-2fa', authGuard, async (req, res) => {
try {
const uid = (req as any).user?.uid
if (!uid) return res.status(401).json(err('unauth'))
const { secret, token } = req.body
const result = await enable2FA(uid, secret, token)
res.json(ok(result))
} catch (e:any) { res.status(400).json(err(e.message)) }
})

r.post('/disable-2fa', authGuard, async (req, res) => {
try {
const uid = (req as any).user?.uid
if (!uid) return res.status(401).json(err('unauth'))
const result = await disable2FA(uid)
res.json(ok(result))
} catch (e:any) { res.status(400).json(err(e.message)) }
})

r.get('/demo-2fa-code', authGuard, async (req, res) => {
try {
const uid = (req as any).user?.uid
if (!uid) return res.status(401).json(err('unauth'))
const demo = await getCurrent2FACode(uid)
res.json(ok(demo))
} catch (e:any) { res.status(400).json(err(e.message)) }
})

r.post('/logout', (req, res) => { res.clearCookie('access_token');
res.json(ok(true)) })
r.get('/me', authGuard, async (req, res) => {
try {
const uid = (req as any).user?.uid
if (!uid) return res.status(401).json(err('unauth'))
const u = await me(uid)
res.json(ok(u))
} catch (e:any) { res.status(400).json(err(e.message)) }
})
export default r
