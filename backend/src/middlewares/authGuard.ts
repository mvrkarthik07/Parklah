import { Request, Response, NextFunction } from 'express'
import { verify } from '../utils/jwt.js'
export function authGuard(req: Request, res: Response, next: NextFunction) {
// Try to get token from Authorization header first, then cookies (for backward compatibility)
const authHeader = req.headers.authorization
const token = authHeader?.startsWith('Bearer ') 
  ? authHeader.substring(7) 
  : req.cookies?.access_token

if (!token) return res.status(401).json({ success: false, error: { code:
'UNAUTH', message: 'Login required' } })
try {
(req as any).user = verify(token)
next()
} catch {
res.status(401).json({ success: false, error: { code: 'UNAUTH', message:
'Invalid token' } })
}
}