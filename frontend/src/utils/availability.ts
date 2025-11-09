import type { Carpark } from '../lib/ranking'

const LABELS: Record<'C' | 'H' | 'S' | 'Y', string> = {
  C: 'Car lots',
  H: 'Heavy vehicle lots',
  S: 'Short-term/season lots',
  Y: 'Motorcycle lots',
}

export function getAvailabilityLines(
  availability?: Carpark['lotAvailability']
): string[] {
  if (!availability) return []
  const lines: string[] = []

  ;(['C', 'H', 'S', 'Y'] as const).forEach((key) => {
    const entry = availability[key]
    if (!entry) return
    const available = entry.available ?? '—'
    const total = entry.total ?? '—'
    lines.push(`${LABELS[key]}: ${available}/${total}`)
  })

  return lines
}
