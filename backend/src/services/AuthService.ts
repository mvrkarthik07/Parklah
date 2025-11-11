import { Prisma, PrismaClient, VehicleType } from '@prisma/client'
import crypto from 'crypto'
import { hash, compare } from '../utils/password'
import { sign } from '../utils/jwt'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

const prisma = new PrismaClient()

export type SanitizedUser = {
  id: string
  email: string
  profile: {
    vehicleType: VehicleType
    vehicleHeight: number
  } | null
  twoFactorEnabled: boolean
}

export type LoginResult = {
  user: SanitizedUser
  token: string | null
  requires2FA: boolean
  twoFactorDemo?: { code: string; expiresIn: number } | null
}

function sanitizeUser(user: any): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    profile: user.profile
      ? {
          vehicleType: user.profile.vehicleType,
          vehicleHeight: user.profile.vehicleHeight,
        }
      : null,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  }
}

function generateDemoCode(secret?: string | null) {
  if (!secret) return null
  try {
    const code = authenticator.generate(secret)
    const step = authenticator.options.step ?? 30
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = step - (now % step)
    return { code, expiresIn }
  } catch {
    return null
  }
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function register(
  email: string,
  password: string,
  vehicleType: VehicleType,
  vehicleHeight: number,
  vehicleNumber?: string | null,
  phoneNumber?: string | null
) {
  const normalizedEmail = email.trim().toLowerCase()
  try {
    const passwordHash = await hash(password)
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash },
    })
    await prisma.profile.create({
      data: {
        userId: user.id,
        vehicleType,
        vehicleHeight,
        // phoneNumber is not a valid property on profile, so remove it
      },
    })
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    })
    const token = sign({ uid: user.id, email: user.email })
    return { user: sanitizeUser(fullUser), token }
  } catch (e: unknown) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002' &&
      Array.isArray(e.meta?.target) &&
      e.meta?.target.includes('email')
    ) {
      throw new Error('Email already in use')
    }
    throw e
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { profile: true },
  })
  if (!user) throw new Error('Invalid credentials')
  const ok = await compare(password, user.passwordHash)
  if (!ok) throw new Error('Invalid credentials')

  if ((user as any).twoFactorEnabled) {
    return {
      user: sanitizeUser(user),
      token: null,
      requires2FA: true,
      twoFactorDemo: null, // Removed demo code - users must use their authenticator app
    }
  }

  const token = sign({ uid: user.id, email: user.email })
  return {
    user: sanitizeUser(user),
    token,
    requires2FA: false,
    twoFactorDemo: null,
  }
}

export async function verify2FA(email: string, token: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { profile: true },
  })
  if (!user || !(user as any).twoFactorEnabled || !(user as any).twoFactorSecret) {
    throw new Error('2FA not enabled')
  }
  const isValid = authenticator.verify({
    token,
    secret: (user as any).twoFactorSecret,
  })
  if (!isValid) throw new Error('Invalid 2FA code')
  const jwtToken = sign({ uid: user.id, email: user.email })
  return { user: sanitizeUser(user), token: jwtToken }
}

export async function setup2FA(uid: string) {
  const user = await prisma.user.findUnique({ where: { id: uid } })
  if (!user) throw new Error('User not found')
  const secret = authenticator.generateSecret()
  const serviceName = 'ParkLah'
  const accountName = user.email
  const otpAuthUrl = authenticator.keyuri(accountName, serviceName, secret)
  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl)
  return { secret, qrCodeUrl }
}

export async function enable2FA(uid: string, secret: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: uid } })
  if (!user) throw new Error('User not found')
  const isValid = authenticator.verify({ token, secret })
  if (!isValid) throw new Error('Invalid 2FA code')
  await prisma.user.update({
    where: { id: uid },
    data: { twoFactorSecret: secret, twoFactorEnabled: true } as Prisma.UserUpdateInput,
  })
  return { success: true }
}

export async function disable2FA(uid: string) {
  await prisma.user.update({
    where: { id: uid },
    data: { twoFactorSecret: null, twoFactorEnabled: false } as Prisma.UserUpdateInput,
  })
  return { success: true }
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = (await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })) as { id: string } | null
  if (!user) {
    // Do not disclose whether the email exists
    return { success: true }
  }
  const token = crypto.randomBytes(32).toString('hex')
  const hashed = hashResetToken(token)
  const expiry = new Date(Date.now() + 15 * 60 * 1000)
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashed, resetTokenExpiry: expiry } as Prisma.UserUpdateInput,
  })
  return { success: true, token } // token returned for demo purposes
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = (await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })) as any
  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    throw new Error('Invalid or expired reset token')
  }
  const hashed = hashResetToken(token)
  if (user.resetToken !== hashed) {
    throw new Error('Invalid or expired reset token')
  }
  if (user.resetTokenExpiry.getTime() < Date.now()) {
    throw new Error('Reset token has expired')
  }
  const passwordHash = await hash(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null } as Prisma.UserUpdateInput,
  })
  return { success: true }
}

export async function me(uid: string) {
  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: { profile: true },
  })
  return user ? sanitizeUser(user) : null
}

export async function getCurrent2FACode(uid: string) {
  const user = await prisma.user.findUnique({ where: { id: uid } })
  if (!user || !(user as any).twoFactorEnabled || !(user as any).twoFactorSecret) {
    throw new Error('2FA not enabled')
  }
  const demo = generateDemoCode((user as any).twoFactorSecret)
  if (!demo) throw new Error('Unable to generate 2FA code')
  return demo
}
