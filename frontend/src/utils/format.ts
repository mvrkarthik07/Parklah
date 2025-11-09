export function formatDistance(distanceM?: number) {
  if (typeof distanceM !== 'number') return '—'
  const km = distanceM / 1000
  if (km < 1) {
    return `${Math.round(distanceM)} m`
  }
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

export function formatEta(etaSeconds?: number) {
  if (typeof etaSeconds !== 'number') return '—'
  const minutes = Math.max(1, Math.round(etaSeconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`
}
