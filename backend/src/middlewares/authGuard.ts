import { Request, Response, NextFunction } from 'express'
import { verify } from '../utils/jwt'
export function authGuard(req: Request, res: Response, next: NextFunction) {
const token = req.cookies?.access_token
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