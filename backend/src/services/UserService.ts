import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
export function getVehicle(userId: string) {
return prisma.profile.findUnique({ where: { userId } })
}
export function setVehicle(userId: string, vehicleType: any, vehicleHeight:
number) {
return prisma.profile.upsert({ where: { userId }, update: { vehicleType,
vehicleHeight }, create: { userId, vehicleType, vehicleHeight } })
}
export function listFavorites(userId: string) { return
prisma.favorite.findMany({ where: { userId } }) }
export function addFavorite(userId: string, carparkId: string, label?: string)
{ return prisma.favorite.create({ data: { userId, carparkId, label } }) }
export function delFavorite(id: string) { return prisma.favorite.delete({
where: { id } }) }
