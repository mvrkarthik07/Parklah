import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'
export function sign(payload: object, expiresIn = '24h') {
return jwt.sign(payload, env.JWT_SECRET as jwt.Secret, { expiresIn } as SignOptions)
}
export function verify(token: string) {
return jwt.verify(token, env.JWT_SECRET) as any
}
