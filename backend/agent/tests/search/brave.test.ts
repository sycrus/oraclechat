import { describe, expect, it } from "vitest"
import { createBraveSearch } from "../../src/search/brave.js"

const reply = (results: unknown[], status = 200) => new Response(JSON.stringify({ web: { results } }), { status })

describe("Brave web search", () => {
  it("queries the web search endpoint with the key header and a five-result cap", async () => {
    let seen: { url: URL; headers: Headers } | undefined
    const search = createBraveSearch({
      apiKey: "secret-key",
      fetchImpl: async (input, init) => { seen = { url: new URL(String(input)), headers: new Headers(init?.headers) }; return reply([]) },
    })
    await search("what is a mercury retrograde?")
    expect(seen?.url.origin + seen?.url.pathname).toBe("https://api.search.brave.com/res/v1/web/search")
    expect(seen?.url.searchParams.get("q")).toBe("what is a mercury retrograde?")
    expect(seen?.url.searchParams.get("count")).toBe("5")
    expect(seen?.headers.get("X-Subscription-Token")).toBe("secret-key")
    expect(seen?.headers.get("Accept")).toBe("application/json")
  })

  it("truncates a long query", async () => {
    let query = ""
    const search = createBraveSearch({ apiKey: "k", fetchImpl: async (input) => { query = new URL(String(input)).searchParams.get("q")!; return reply([]) } })
    await search("q".repeat(900))
    expect(query).toHaveLength(400)
  })

  it("returns cleaned results: markup stripped, bad URLs dropped, capped at five", async () => {
    const results = [
      { title: "A <strong>bold</strong> title", url: "https://example.com/a", description: "Fish &amp; <b>chips</b> &lt;3" },
      { title: "Script", url: "javascript:alert(1)", description: "bad" },
      { title: "No url", description: "bad" },
      ...Array.from({ length: 8 }, (_, i) => ({ title: `T${i}`, url: `https://example.com/${i}`, description: `D${i}` })),
    ]
    const found = await createBraveSearch({ apiKey: "k", fetchImpl: async () => reply(results) })("anything")
    expect(found).toHaveLength(5)
    expect(found[0]).toEqual({ title: "A bold title", url: "https://example.com/a", description: "Fish & chips <3" })
    expect(found.every((result) => /^https?:\/\//.test(result.url))).toBe(true)
  })

  it("returns no results when the response has none", async () => {
    expect(await createBraveSearch({ apiKey: "k", fetchImpl: async () => new Response("{}") })("x")).toEqual([])
  })

  it("throws without leaking the key on an HTTP error or bad JSON", async () => {
    const failing = createBraveSearch({ apiKey: "secret-key", fetchImpl: async () => new Response("denied secret-key", { status: 401 }) })
    await expect(failing("x")).rejects.toThrow(/401/)
    await expect(failing("x")).rejects.not.toThrow(/secret-key/)
    const garbled = createBraveSearch({ apiKey: "secret-key", fetchImpl: async () => new Response("not json") })
    await expect(garbled("x")).rejects.toThrow()
  })

  it("aborts after the timeout", async () => {
    const hanging = createBraveSearch({
      apiKey: "k", timeoutMs: 20,
      fetchImpl: (_input, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))) }),
    })
    await expect(hanging("x")).rejects.toThrow(/timed out|aborted/i)
  })
})
