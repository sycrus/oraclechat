import { lookup as dnsLookup } from "node:dns/promises"
import { isIP } from "node:net"

export interface LinkPage {
  url: string
  title: string
  text: string
}

export type ReadLink = (url: string) => Promise<LinkPage>

export interface LinkReaderConfig {
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>
  lookup?: (host: string) => Promise<Array<{ address: string; family: number }>>
  timeoutMs?: number
}

const MAX_LINKS = 2
const MAX_REDIRECTS = 3
const MAX_BYTES = 1_000_000
const MAX_TEXT = 6000
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" }

/** Up to two unique http(s) links from a message, without trailing punctuation. */
export function extractLinks(text: string): string[] {
  const links: string[] = []
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const link = match[0].replace(/[.,;:!?)\]}]+$/, "")
    if (!links.includes(link)) links.push(link)
    if (links.length === MAX_LINKS) break
  }
  return links
}

function ipv4Blocked(address: string): boolean {
  const [a, b] = address.split(".").map(Number) as [number, number]
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
}

function expandIpv6(address: string): number[] {
  let text = address.toLowerCase()
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) {
    const [a, b, c, d] = dotted[1]!.split(".").map(Number) as [number, number, number, number]
    text = text.slice(0, -dotted[1]!.length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const [head, tail] = text.split("::") as [string, string | undefined]
  const left = head ? head.split(":") : []
  const right = tail ? tail.split(":") : []
  const middle = tail === undefined ? [] : Array(8 - left.length - right.length).fill("0")
  return [...left, ...middle, ...right].map((part) => parseInt(part, 16))
}

/** True for loopback, private, link-local, CGNAT/Tailscale, multicast and unspecified addresses (IPv4, IPv6 and mapped). */
export function isBlockedAddress(address: string): boolean {
  if (isIP(address) === 4) return ipv4Blocked(address)
  const parts = expandIpv6(address)
  if (parts.length !== 8 || parts.some((part) => Number.isNaN(part))) return true
  const isMapped = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff
  if (isMapped) return ipv4Blocked(`${parts[6]! >> 8}.${parts[6]! & 255}.${parts[7]! >> 8}.${parts[7]! & 255}`)
  const first = parts[0]!
  return parts.every((part) => part === 0)
    || (parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1)
    || (first & 0xfe00) === 0xfc00
    || (first & 0xffc0) === 0xfe80
    || (first & 0xff00) === 0xff00
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) return String.fromCodePoint(parseInt(name.slice(2), 16))
    if (name.startsWith("#") && name !== "#39") return String.fromCodePoint(Number(name.slice(1)))
    return ENTITIES[name.toLowerCase()] ?? entity
  })
}

function clean(text: string): string {
  const withoutInline = text.replace(/<\/?(a|abbr|b|code|em|i|mark|small|span|strong|sub|sup|u)\b[^>]*>/gi, "")
  return decodeEntities(withoutInline.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim()
}

async function readCapped(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length"))
  if (declared > MAX_BYTES) throw new Error("Link is too large")
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error("Link is too large") }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

/** Fetches a pasted link for the tellers, refusing anything that could reach the PC, the LAN or the tailnet. */
export function createLinkReader(config: LinkReaderConfig = {}): ReadLink {
  const doFetch = config.fetchImpl ?? ((input, init) => fetch(input, init))
  const resolve = config.lookup ?? ((host) => dnsLookup(host, { all: true }))
  const timeoutMs = config.timeoutMs ?? 8000

  async function assertAllowed(url: URL): Promise<void> {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Link must be http or https")
    if (url.username || url.password) throw new Error("Link has credentials")
    const host = url.hostname.replace(/^\[|\]$/g, "")
    const addresses = isIP(host) ? [{ address: host }] : await resolve(host)
    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) throw new Error("Link points to a blocked address")
  }

  return async (link) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      let url = new URL(link)
      for (let hop = 0; ; hop += 1) {
        await assertAllowed(url)
        const response = await doFetch(url.toString(), { redirect: "manual", signal: controller.signal, headers: { Accept: "text/html, text/plain" } })
        if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
          if (hop === MAX_REDIRECTS) throw new Error("Link has too many redirects")
          url = new URL(response.headers.get("location")!, url)
          continue
        }
        if (!response.ok) throw new Error(`Link returned status ${response.status}`)
        const type = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase()
        if (type !== "text/html" && type !== "text/plain") throw new Error("Link has unsupported content")
        const body = await readCapped(response)
        if (type === "text/plain") return { url: link, title: link, text: body.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) }
        const title = clean(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || link
        const text = clean(body.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")).slice(0, MAX_TEXT)
        return { url: link, title, text }
      }
    } catch (error) {
      if (controller.signal.aborted) throw new Error("Link timed out")
      throw error instanceof Error && error.message.startsWith("Link ") ? error : new Error("Link could not be opened")
    } finally {
      clearTimeout(timer)
    }
  }
}
