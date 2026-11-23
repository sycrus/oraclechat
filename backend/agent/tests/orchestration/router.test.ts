import { describe, expect, it } from "vitest"
import { routeTurn, selectGroupResponders, validateRouterResponse, type TellerScore } from "../../src/orchestration/router.js"
import type { AgentRequest } from "../../src/agent/runtime.js"
import { TellerRegistry } from "../../src/tellers/registry.js"

/** A Mira and Sage group: these cases are written for that pair, in that order. */
const miraAndSage = (registry: TellerRegistry) => ["mira-the-mystic", "sage-the-seer"].map((id) => registry.get(id)!)

describe("group responder selection", () => {
  const scores: TellerScore[] = [
    { tellerId: "mira", score: 0.8, matchedCategories: ["topics"] },
    { tellerId: "sage", score: 0.6, matchedCategories: ["emotionalTones"] },
    { tellerId: "third", score: 0.2, matchedCategories: [] },
  ]

  it("selects every scored teller, highest score first", () => {
    expect(selectGroupResponders(scores, {})).toEqual(["mira", "sage", "third"])
  })

  it("breaks score ties by least recently spoken", () => {
    const tied = scores.slice(0, 2).map((entry) => ({ ...entry, score: 0.7 }))
    expect(selectGroupResponders(tied, { mira: 10, sage: 4 })).toEqual(["sage", "mira"])
  })

  it("keeps a low ranked teller in the reply order", () => {
    const low = [
      { tellerId: "mira", score: 0.82, matchedCategories: [] },
      { tellerId: "sage", score: 0.1, matchedCategories: [] },
    ] satisfies TellerScore[]
    expect(selectGroupResponders(low, {})).toEqual(["mira", "sage"])
  })

  it("validates rank values and exactly one score per teller", async () => {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    const tellers = miraAndSage(registry)
    expect(() => validateRouterResponse(JSON.stringify([
      { tellerId: "mira-the-mystic", score: 1.2, matchedCategories: [] },
      { tellerId: "sage-the-seer", score: 0.2, matchedCategories: [] },
    ]), tellers)).toThrow()
    expect(() => validateRouterResponse(JSON.stringify([
      { tellerId: "mira-the-mystic", score: 0.8, matchedCategories: [] },
    ]), tellers)).toThrow("exactly one score")
  })

  it("drops matched categories that are not activation-profile category names", async () => {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")

    expect(validateRouterResponse(JSON.stringify([
      { tellerId: "mira-the-mystic", score: 0, matchedCategories: [] },
      { tellerId: "sage-the-seer", score: 1, matchedCategories: ["emotions", "situations"] },
    ]), miraAndSage(registry))).toEqual([
      { tellerId: "mira-the-mystic", score: 0, matchedCategories: [], reading: "none" },
      { tellerId: "sage-the-seer", score: 1, matchedCategories: ["situations"], reading: "none" },
    ])
  })

  it("attaches teller IDs by roster order when the local model omits optional rank metadata", async () => {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")

    expect(validateRouterResponse(JSON.stringify([
      { score: 0.82 },
      { score: 0.41 },
    ]), miraAndSage(registry))).toEqual([
      { tellerId: "mira-the-mystic", score: 0.82, matchedCategories: [], reading: "none" },
      { tellerId: "sage-the-seer", score: 0.41, matchedCategories: [], reading: "none" },
    ])
  })

  it("reads the JSON score array when the local model adds trailing explanation", async () => {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")

    expect(validateRouterResponse('[{"score":0.82},{"score":0.41}] These are the relevance scores.', miraAndSage(registry)))
      .toEqual([
        { tellerId: "mira-the-mystic", score: 0.82, matchedCategories: [], reading: "none" },
        { tellerId: "sage-the-seer", score: 0.41, matchedCategories: [], reading: "none" },
      ])
  })
})

describe("turn routing", () => {
  async function roster() {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    return miraAndSage(registry)
  }

  it("reads each teller's reading request, spread and search query", async () => {
    const routes = validateRouterResponse(JSON.stringify([
      { score: 0.9, reading: "named", spread: "celtic-cross", query: "  full moon dates November 2026  " },
      { score: 0.4, reading: "unnamed" },
    ]), await roster())
    expect(routes[0]).toEqual({ tellerId: "mira-the-mystic", score: 0.9, matchedCategories: [], reading: "named", spread: "celtic-cross", query: "full moon dates November 2026" })
    expect(routes[1]).toEqual({ tellerId: "sage-the-seer", score: 0.4, matchedCategories: [], reading: "unnamed" })
  })

  it("keeps spreads for tarot readings only, defaulting to three cards", async () => {
    const routes = validateRouterResponse(JSON.stringify([
      { score: 0.5, reading: "named", spread: "nine-card" },
      { score: 0.5, reading: "named", spread: "one-card" },
    ]), await roster())
    expect(routes[0]!.spread).toBe("three-card")
    expect(routes[1]).not.toHaveProperty("spread")
    const none = validateRouterResponse(JSON.stringify([{ score: 0.5, reading: "none", spread: "one-card" }, { score: 0.5 }]), await roster())
    expect(none[0]).not.toHaveProperty("spread")
  })

  it("reads the schema's { routes } object, where spread none and an empty query mean no value", async () => {
    const routes = validateRouterResponse(JSON.stringify({ routes: [
      { tellerId: "mira-the-mystic", score: 0.8, matchedCategories: ["topics"], reading: "named", spread: "none", query: "" },
      { tellerId: "sage-the-seer", score: 0.2, matchedCategories: [], reading: "none", spread: "none", query: "" },
    ] }), await roster())
    expect(routes).toEqual([
      { tellerId: "mira-the-mystic", score: 0.8, matchedCategories: ["topics"], reading: "named", spread: "three-card" },
      { tellerId: "sage-the-seer", score: 0.2, matchedCategories: [], reading: "none" },
    ])
  })

  it("treats an unknown reading value as no reading", async () => {
    const routes = validateRouterResponse(JSON.stringify([{ score: 0.5, reading: "maybe" }, { score: 0.5, reading: 3 }]), await roster())
    expect(routes.map((route) => route.reading)).toEqual(["none", "none"])
  })

  it("caps queries at 200 characters and drops blank or non-text ones", async () => {
    const routes = validateRouterResponse(JSON.stringify([
      { score: 0.5, query: "a".repeat(300) },
      { score: 0.5, query: "   " },
    ]), await roster())
    expect(routes[0]!.query).toHaveLength(200)
    expect(routes[1]).not.toHaveProperty("query")
    const nonText = validateRouterResponse(JSON.stringify([{ score: 0.5, query: 42 }, { score: 0.5, query: null }]), await roster())
    expect(nonText.every((route) => !("query" in route))).toBe(true)
  })

  it("sends the model tellers, disciplines, last turn's replies and the message, without thinking and without memories", async () => {
    const tellers = await roster()
    const requests: AgentRequest[] = []
    const routes = await routeTurn({
      tellers,
      previousReplies: [{ tellerName: "Mira", content: "Want me to pull some cards on that?" }],
      message: "yes go ahead",
    }, undefined, async (request) => {
      requests.push(request)
      return JSON.stringify([{ score: 0.7, reading: "named", spread: "three-card" }, { score: 0.3, reading: "none" }])
    })
    expect(routes[0]!.reading).toBe("named")
    expect(requests).toHaveLength(1)
    expect(requests[0]!.thinking).toBe(false)
    expect(requests[0]!.temperature).toBe(0)
    const schema = requests[0]!.outputSchema!.schema as { properties: { routes: { items: { properties: Record<string, { enum?: string[] }> } } } }
    const fields = schema.properties.routes.items.properties
    expect(fields.tellerId!.enum).toEqual(tellers.map((teller) => teller.id))
    expect(fields.reading!.enum).toEqual(["named", "unnamed", "none"])
    expect(fields.spread!.enum).toEqual(["one-card", "three-card", "celtic-cross", "none"])
    const input = JSON.parse(requests[0]!.input) as Record<string, unknown>
    expect(Object.keys(input).sort()).toEqual(["message", "previousReplies", "tellers"])
    expect(input.message).toBe("yes go ahead")
    expect(input.previousReplies).toEqual([{ tellerName: "Mira", content: "Want me to pull some cards on that?" }])
    expect(input.tellers).toEqual(tellers.map((teller) => ({ id: teller.id, name: teller.displayName, discipline: teller.discipline, activationProfile: teller.activationProfile })))
  })

  it("gives an astrology teller's reading no spread, next to Mira's three cards", async () => {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    const routes = validateRouterResponse(JSON.stringify([{ score: 0.8, reading: "named", spread: "celtic-cross" }, { score: 0.5, reading: "named" }]),
      ["astra-the-astrologer", "mira-the-mystic"].map((id) => registry.get(id)!))
    expect(routes[0]).toEqual({ tellerId: "astra-the-astrologer", score: 0.8, matchedCategories: [], reading: "named" })
    expect(routes[1]!.spread).toBe("three-card")
  })

  it("tells the model that asking about a chart or transits is a reading request", async () => {
    const requests: AgentRequest[] = []
    await routeTurn({ tellers: (await roster()).slice(0, 1), previousReplies: [], message: "hi" }, undefined, async (request) => {
      requests.push(request)
      return JSON.stringify([{ score: 1, reading: "none" }])
    })
    expect(requests[0]!.instructions).toMatch(/birth chart/)
    expect(requests[0]!.instructions).toMatch(/transits/)
  })

  it("routes a single teller for a one-to-one chat", async () => {
    const tellers = (await roster()).slice(0, 1)
    const routes = await routeTurn({ tellers, previousReplies: [], message: "Mira, read for me" }, undefined,
      async () => JSON.stringify([{ score: 1, reading: "named" }]))
    expect(routes).toEqual([{ tellerId: "mira-the-mystic", score: 1, matchedCategories: [], reading: "named", spread: "three-card" }])
  })

  it("shortens long previous replies", async () => {
    const requests: AgentRequest[] = []
    await routeTurn({ tellers: (await roster()).slice(0, 1), previousReplies: [{ tellerName: "Mira", content: "x".repeat(2000) }], message: "hm" }, undefined,
      async (request) => { requests.push(request); return JSON.stringify([{ score: 1 }]) })
    const input = JSON.parse(requests[0]!.input) as { previousReplies: Array<{ content: string }> }
    expect(input.previousReplies[0]!.content.length).toBeLessThanOrEqual(600)
  })
})
