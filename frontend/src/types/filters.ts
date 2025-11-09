export type Filters = {
  carparkType: string
  vehicleType: string
  price: 'any' | 'budget' | 'standard' | 'premium'
  maxDistance: number | null
  availability: 'any' | 'high' | 'medium' | 'low'
}
