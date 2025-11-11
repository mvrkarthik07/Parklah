import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
export function getVehicle(userId: string) {
return prisma.profile.findUnique({ where: { userId } })
}
export function setVehicle(
  userId: string,
  vehicleType: any,
  vehicleHeight: number,
  vehicleNumber?: string | null
) {
  return prisma.profile.upsert({
    where: { userId },
    update: {
      vehicleType,
      vehicleHeight,
      vehicleNumber: vehicleNumber?.trim() || null,
    },
    create: {
      userId,
      vehicleType,
      vehicleHeight,
      vehicleNumber: vehicleNumber?.trim() || null,
    },
  })
}
export function listFavorites(userId: string) { return
prisma.favorite.findMany({ where: { userId } }) }
export function addFavorite(userId: string, carparkId: string, label?: string)
{ return prisma.favorite.create({ data: { userId, carparkId, label } }) }
export function delFavorite(id: string) { return prisma.favorite.delete({
where: { id } }) }
