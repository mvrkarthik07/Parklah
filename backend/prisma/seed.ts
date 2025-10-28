import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
const prisma = new PrismaClient()
async function main() {
const email = 'demo@carparkers.app'
const password = 'Password!2345'
const passwordHash = await bcrypt.hash(password, 12)
const user = await prisma.user.upsert({
where: { email },
update: {},
create: { email, passwordHash }
})
await prisma.profile.upsert({
where: { userId: user.id },
update: { vehicleType: 'CAR', vehicleHeight: 1.6 },
create: { userId: user.id, vehicleType: 'CAR', vehicleHeight: 1.6 }
})
console.log('Seeded demo user:', email)
}
main().finally(()=>prisma.$disconnect())