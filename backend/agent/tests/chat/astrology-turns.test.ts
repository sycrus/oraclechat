import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { beforeEach, describe, expect, it } from "vitest"
import { PostgresChatStore } from "../../src/chat/store.js"
import { ChatService, type ChatEvent } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import { PostgresMemoryStore } from "../../src/memory/store.js"
import { MemoryService } from "../../src/memory/service.js"
import { PostgresBirthProfileStore } from "../../src/astrology/profile-store.js"
import { searchPlaces } from "../../src/astrology/places.js"
import type { TurnRoute } from "../../src/orchestration/router.js"

const ASTRA = "astra-the-astrologer"
const SAGE = "sage-the-seer"
const CHART = "Application-computed birth chart and transits you were asked for"
const sanFrancisco = searchPlaces("san francisco")[0]!
const BIRTH_LEAKS = ["1990-07-01", "12:00", "San Francisco", "California", "37.77", "122.4", "America/Los_Angeles"]

const route = (tellerId: string, reading: TurnRoute["reading"], score = 1): TurnRoute => ({ tellerId, score, matchedCategories: [], reading })

describe("astrology turns", () => {
  let store: PostgresChatStore
  let registry: TellerRegistry
  let memory: MemoryService
  let birthProfiles: PostgresBirthProfileStore

  beforeEach(async () => {
    const { Pool: MemoryPool } = newDb().adapters.createPg()
    const pool = new MemoryPool() as unknown as Pool
    store = new PostgresChatStore(pool)
    await store.initialize()
    const memoryStore = new PostgresMemoryStore(pool)
    await memoryStore.initialize()
    memory = new MemoryService(memoryStore)
    birthProfiles = new PostgresBirthProfileStore(pool)
    await birthProfiles.initialize()
    await birthProfiles.save({ date: "1990-07-01", time: "12:00", placeId: sanFrancisco.id })
    registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
  })

  function setup(routes: TurnRoute[], extra: Partial<ConstructorParameters<typeof ChatService>[0]> = {}) {
    const requests: Array<{ name: string; input: string }> = []
    const events: ChatEvent[] = []
    const service = new ChatService({
      store, registry, memory, birthProfiles,
      route: async () => routes,
      stream: async (request, onChunk) => { requests.push(request); onChunk(`${request.name} replies.`); return `${request.name} replies.` },
      ...extra,
    })
    return { service, events, emit: (event: ChatEvent) => events.push(event), inputOf: (name: string) => requests.find((request) => request.name === name)!.input }
  }

  it("computes Astra's chart from the saved details and gives her the precise view without the details", async () => {
    const { service, events, emit, inputOf } = setup([route(ASTRA, "named")])
    const conversation = await service.createConversation([ASTRA])
    await service.sendMessage(conversation.id, "Astra, what's my chart saying?", emit)

    const start = events.find((event) => event.type === "message_start" && event.tellerId === ASTRA)
    expect(start?.reading).toMatchObject({ method: "natal-transits" })
    const saved = (await store.getConversation(conversation.id))!.messages.find((message) => message.senderId === ASTRA)!
    expect(saved.reading).toMatchObject({ method: "natal-transits", natal: { planets: expect.arrayContaining([expect.objectContaining({ point: "sun", sign: "cancer" })]) } })

    const input = inputOf("Astra")
    expect(input).toContain(CHART)
    expect(input).toMatch(/Sun in Cancer \d+(\.\d+)?°/)
    for (const leak of BIRTH_LEAKS) expect(input, leak).not.toContain(leak)
  })

  it("gives hosted replies the coarse view, for Astra and for Sage reacting to her reading, without sharing", async () => {
    const { service, emit, inputOf } = setup([route(ASTRA, "named"), route(SAGE, "none", 0.5)], { hostedReplies: true })
    const conversation = await service.createConversation([ASTRA, SAGE])
    await service.sendMessage(conversation.id, "Astra, read my chart", emit)

    expect(inputOf("Astra")).toContain(CHART)
    expect(inputOf("Astra")).not.toMatch(/\d°/)
    expect(inputOf("Sage")).toMatch(/Reading by Astra/)
    expect(inputOf("Sage")).toMatch(/Sun in Cancer, \d+(st|nd|rd|th) house/)
    expect(inputOf("Sage")).not.toMatch(/\d°/)
    for (const leak of BIRTH_LEAKS) expect(inputOf("Sage"), leak).not.toContain(leak)
  })

  it("gives hosted replies the precise view when sharing saved details is on", async () => {
    await memory.setConsent(true)
    await memory.setHostedConsent(true)
    const { service, emit, inputOf } = setup([route(ASTRA, "named")], { hostedReplies: true })
    const conversation = await service.createConversation([ASTRA])
    await service.sendMessage(conversation.id, "Astra, read my chart", emit)
    expect(inputOf("Astra")).toMatch(/\d°/)
  })

  it("keeps the saved chart complete even when the teller saw the coarse view", async () => {
    const { service, emit } = setup([route(ASTRA, "named")], { hostedReplies: true })
    const conversation = await service.createConversation([ASTRA])
    await service.sendMessage(conversation.id, "Astra, read my chart", emit)
    const saved = (await store.getConversation(conversation.id))!.messages.find((message) => message.senderId === ASTRA)!
    expect((saved.reading as { natal: { planets: Array<{ degree: number }> } }).natal.planets.every((planet) => typeof planet.degree === "number")).toBe(true)
  })

  it("gives Astra her own earlier chart as reference on a later turn without a reading", async () => {
    const routes = [route(ASTRA, "named")]
    const { service, emit } = setup(routes)
    const conversation = await service.createConversation([ASTRA])
    await service.sendMessage(conversation.id, "Astra, read my chart", emit)
    routes[0] = route(ASTRA, "none")
    const requests: string[] = []
    const later = new ChatService({ store, registry, memory, birthProfiles, route: async () => routes, stream: async (request) => { requests.push(request.input); return "ok" } })
    await later.sendMessage(conversation.id, "what did you mean by Saturn?", () => {})
    expect(requests[0]).toMatch(/Your most recent reading \(for reference\):[\s\S]*Saturn in Capricorn/)
  })
})
