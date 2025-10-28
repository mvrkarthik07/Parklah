import { PrismaClient } from '@prisma/client'
import { hash, compare } from '../utils/password'
import { sign } from '../utils/jwt'
const prisma = new PrismaClient()
export async function register(email: string, password: string, vehicleType:
any, vehicleHeight: number) {
const passwordHash = await hash(password)
const user = await prisma.user.create({ data: { email, passwordHash } })
await prisma.profile.create({ data: { userId: user.id, vehicleType,
vehicleHeight } })
const token = sign({ uid: user.id, email: user.email })
return { user, token }
}
export async function login(email: string, password: string) {
const user = await prisma.user.findUnique({ where: { email }, include: {
profile: true } })
if (!user) throw new Error('Invalid credentials')
const ok = await compare(password, user.passwordHash)
if (!ok) throw new Error('Invalid credentials')
const token = sign({ uid: user.id, email: user.email })
return { user, token }
}
export async function me(uid: string) {
return prisma.user.findUnique({ where: { id: uid }, include: { profile:

true } })
}
