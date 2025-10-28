export async function jfetch(url: string, init?: RequestInit, retries = 1,
timeoutMs = 6000): Promise<any> {
const controller = new AbortController()
const to = setTimeout(() => controller.abort(), timeoutMs)
try {
const res = await fetch(url, { ...init, signal: controller.signal })
if (!res.ok) throw new Error(`HTTP ${res.status}`)
return await res.json()
} catch (e) {
if (retries > 0) return jfetch(url, init, retries - 1, timeoutMs)
throw e
} finally { clearTimeout(to) }
}