import { env } from '../config/env'

type OneMapAuthResp = { access_token: string }
type OneMapSearchItem = {
  LATITUDE: string
  LONGITUDE: string
  ADDRESS: string
}
type OneMapSearchResp = { results?: OneMapSearchItem[] }

async function getOneMapToken(): Promise<string> {
  const r = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.ONEMAP_EMAIL, password: env.ONEMAP_PASSWORD }),
  })
  if (!r.ok) throw new Error(`OneMap auth failed: ${r.status}`)
  const j = (await r.json()) as OneMapAuthResp
  return j.access_token
}

export async function normalizeLocation(q: string) {
  const token = await getOneMapToken()
  const url =
    `https://www.onemap.gov.sg/api/common/elastic/search?` +
    `searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  const r = await fetch(url, { headers: { Authorization: token } })
  if (!r.ok) throw new Error(`OneMap search failed: ${r.status}`)
  const j = (await r.json()) as OneMapSearchResp
  const first = j.results && j.results[0]
  if (!first) throw new Error('No geocode results')
  return {
    lat: parseFloat(first.LATITUDE),
    lng: parseFloat(first.LONGITUDE),
    address: first.ADDRESS,
  }
}
