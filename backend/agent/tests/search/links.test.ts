import { describe, expect, it } from "vitest"
import { createLinkReader, extractLinks, isBlockedAddress } from "../../src/search/links.js"

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }]

function html(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, ...init })
}

describe("extractLinks", () => {
  it("finds up to two unique http(s) links and drops trailing punctuation", () => {
    expect(extractLinks("see https://a.example/x, and (http://b.example/y). also https://a.example/x and https://c.example"))
      .toEqual(["https://a.example/x", "http://b.example/y"])
  })

  it("ignores other schemes and text without links", () => {
    expect(extractLinks("ftp://a.example file:///etc/passwd javascript:alert(1) hello")).toEqual([])
  })
})

describe("isBlockedAddress", () => {
  it.each([
    "0.0.0.0", "10.1.2.3", "100.64.0.1", "100.127.255.254", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255",
    "192.168.1.10", "224.0.0.1", "255.255.255.255", "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:192.168.0.1",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true)
  })

  it.each(["93.184.216.34", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false)
  })
})

describe("createLinkReader", () => {
  it("returns the page title and readable text without scripts or styles", async () => {
    const read = createLinkReader({
      lookup: publicLookup,
      fetchImpl: async () => html("<html><head><title>Moon &amp; Tides</title><style>p{}</style></head><body><script>steal()</script><p>The full   moon is on <b>Friday</b>.</p><noscript>enable js</noscript></body></html>"),
    })
    expect(await read("https://news.example/moon")).toEqual({ url: "https://news.example/moon", title: "Moon & Tides", text: "Moon & Tides The full moon is on Friday." })
  })

  it("reads plain text and caps text at 6,000 characters", async () => {
    const read = createLinkReader({ lookup: publicLookup, fetchImpl: async () => new Response("word ".repeat(3000), { headers: { "content-type": "text/plain" } }) })
    const page = await read("https://example.com/notes.txt")
    expect(page.title).toBe("https://example.com/notes.txt")
    expect(page.text.length).toBeLessThanOrEqual(6000)
  })

  it("refuses a host that resolves to a private address", async () => {
    let fetched = false
    const read = createLinkReader({ lookup: async () => [{ address: "93.184.216.34", family: 4 }, { address: "192.168.1.5", family: 4 }], fetchImpl: async () => { fetched = true; return html("x") } })
    await expect(read("https://sneaky.example")).rejects.toThrow("blocked address")
    expect(fetched).toBe(false)
  })

  it("refuses IP-literal links to the PC itself", async () => {
    const read = createLinkReader({ fetchImpl: async () => html("x") })
    await expect(read("http://127.0.0.1:4000/health")).rejects.toThrow("blocked address")
    await expect(read("http://[::1]:3000/")).rejects.toThrow("blocked address")
  })

  it("refuses links with credentials", async () => {
    const read = createLinkReader({ lookup: publicLookup, fetchImpl: async () => html("x") })
    await expect(read("https://user:pass@example.com")).rejects.toThrow("credentials")
  })

  it("re-checks every redirect and refuses one to a blocked host", async () => {
    const seen: string[] = []
    const read = createLinkReader({
      lookup: async (host) => host === "internal.example" ? [{ address: "10.0.0.2", family: 4 }] : [{ address: "93.184.216.34", family: 4 }],
      fetchImpl: async (input) => { seen.push(String(input)); return new Response(null, { status: 302, headers: { location: "http://internal.example/admin" } }) },
    })
    await expect(read("https://public.example")).rejects.toThrow("blocked address")
    expect(seen).toEqual(["https://public.example/"])
  })

  it("follows up to three redirects", async () => {
    let hops = 0
    const follow = createLinkReader({
      lookup: publicLookup,
      fetchImpl: async () => (hops += 1) <= 3 ? new Response(null, { status: 301, headers: { location: `/hop${hops}` } }) : html("<title>Done</title>"),
    })
    expect((await follow("https://example.com")).title).toBe("Done")

    const loop = createLinkReader({ lookup: publicLookup, fetchImpl: async () => new Response(null, { status: 302, headers: { location: "/again" } }) })
    await expect(loop("https://example.com")).rejects.toThrow("too many redirects")
  })

  it("refuses non-text content, error statuses and oversized pages", async () => {
    const pdf = createLinkReader({ lookup: publicLookup, fetchImpl: async () => new Response("%PDF", { headers: { "content-type": "application/pdf" } }) })
    await expect(pdf("https://example.com/a.pdf")).rejects.toThrow("unsupported content")

    const missing = createLinkReader({ lookup: publicLookup, fetchImpl: async () => html("nope", { status: 404 }) })
    await expect(missing("https://example.com/gone")).rejects.toThrow("status 404")

    const huge = createLinkReader({ lookup: publicLookup, fetchImpl: async () => html("a".repeat(1_100_000)) })
    await expect(huge("https://example.com/huge")).rejects.toThrow("too large")
  })

  it("times out a slow page", async () => {
    const read = createLinkReader({
      lookup: publicLookup,
      timeoutMs: 20,
      fetchImpl: (_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    })
    await expect(read("https://slow.example")).rejects.toThrow("timed out")
  })
})
