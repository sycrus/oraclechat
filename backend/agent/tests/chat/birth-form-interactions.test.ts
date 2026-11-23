import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { PostgresChatStore } from "../../src/chat/store.js"
import { ChatService, type ChatEvent, type ChatServiceOptions } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import { PostgresBirthProfileStore } from "../../src/astrology/profile-store.js"
import { searchPlaces } from "../../src/astrology/places.js"
import type { RouteTurnInput, TurnRoute } from "../../src/orchestration/router.js"

const ASTRA = "astra-the-astrologer"
const sanFrancisco = searchPlaces("san francisco")[0]!
const details = { date: "1990-07-01", time: "12:00", placeId: sanFrancisco.id, consent: true }

const exporter = new InMemorySpanExporter()
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
beforeAll(() => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
  trace.setGlobalTracerProvider(provider)
})
afterAll(() => provider.shutdown())

describe("birth-details form", () => {
  let store: PostgresChatStore
  let registry: TellerRegistry
  let birthProfiles: PostgresBirthProfileStore

  beforeEach(async () => {
    exporter.reset()
    const { Pool: MemoryPool } = newDb().adapters.createPg()
    const pool = new MemoryPool() as unknown as Pool
    store = new PostgresChatStore(pool)
    await store.initialize()
    birthProfiles = new PostgresBirthProfileStore(pool)
    await birthProfiles.initialize()
    registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
  })

  /** Astra is asked for a reading by any message that says "chart". */
  const route = async (input: RouteTurnInput): Promise<TurnRoute[]> =>
    input.tellers.map((teller) => ({ tellerId: teller.id, score: 1, matchedCategories: [], reading: /chart/i.test(input.message) ? "named" : "none" }))

  function build(extra: Partial<ChatServiceOptions> = {}) {
    const requests: Array<{ name: string; input: string }> = []
    const events: ChatEvent[] = []
    const service = new ChatService({
      store, registry, route, birthProfiles,
      stream: async (request, onChunk) => { requests.push(request); onChunk("Astra reads your sky."); return "Astra reads your sky." },
      ...extra,
    })
    return { service, requests, events, emit: (event: ChatEvent) => events.push(event) }
  }

  async function laidOut(extra: Partial<ChatServiceOptions> = {}) {
    const harness = build(extra)
    const conversation = await harness.service.createConversation([ASTRA])
    await harness.service.sendMessage(conversation.id, "Astra, read my chart", harness.emit)
    const stored = async () => (await store.getConversation(conversation.id))!.messages
    const form = (await stored()).find((message) => message.interaction)!
    harness.events.length = 0
    const submit = (body: unknown = { action: "submit", details }) => harness.service.interact(conversation.id, form.id, body, harness.emit)
    return { ...harness, conversationId: conversation.id, form, stored, submit }
  }

  it("lays out a form from Astra with her invitation and no chart when no details are saved", async () => {
    const { form, requests } = await laidOut()
    expect(form.senderId).toBe(ASTRA)
    expect(form.content).toBe(registry.get(ASTRA)!.birthDetails!.invitation)
    expect(form.interaction).toEqual({ kind: "birth-details", state: "open" })
    expect(form.reading).toBeUndefined()
    expect(requests).toHaveLength(0)
  })

  it("sets an earlier open form aside when a new one is laid out", async () => {
    const { service, conversationId, form, stored, emit } = await laidOut()
    await service.sendMessage(conversationId, "Astra, my chart please", emit)
    const forms = (await stored()).filter((message) => message.interaction?.kind === "birth-details")
    expect(forms).toHaveLength(2)
    expect(forms.find((message) => message.id === form.id)!.interaction).toEqual({ kind: "birth-details", state: "set-aside" })
    expect(forms.find((message) => message.id !== form.id)!.interaction!.state).toBe("open")
  })

  it("saves the details, saves the chart on the form message and streams the interpretation on submit", async () => {
    const { submit, stored, events, requests, form } = await laidOut()
    const updated = await submit()

    expect(await birthProfiles.get()).toEqual({ date: "1990-07-01", time: "12:00", placeId: sanFrancisco.id })
    expect(updated.interaction).toEqual({ kind: "birth-details", state: "submitted" })
    const [formMessage, interpretation] = (await stored()).filter((message) => message.senderType === "teller")
    expect(formMessage!.id).toBe(form.id)
    expect(formMessage!.reading).toMatchObject({ method: "natal-transits" })
    expect(interpretation!.content).toBe("Astra reads your sky.")
    expect(interpretation!.reading).toBeUndefined()
    expect(events.some((event) => event.type === "message_update" && event.message?.id === form.id)).toBe(true)
    expect(requests[0]!.input).toContain("The user just shared their birth details")
    for (const leak of ["1990-07-01", "12:00", "San Francisco"]) expect(requests[0]!.input).not.toContain(leak)
  })

  it("rejects a second submission with 409 and makes no second reading", async () => {
    const { submit, requests } = await laidOut()
    await submit()
    await expect(submit()).rejects.toMatchObject({ status: 409 })
    expect(requests).toHaveLength(1)
  })

  it("rejects invalid details or missing consent with 400 and keeps the form open", async () => {
    const { submit, stored, form } = await laidOut()
    for (const body of [{ action: "submit", details: { ...details, consent: false } }, { action: "submit", details: { ...details, date: "1990-02-30" } }, { action: "submit" }]) {
      await expect(submit(body)).rejects.toMatchObject({ status: 400 })
    }
    expect((await stored()).find((message) => message.id === form.id)!.interaction!.state).toBe("open")
    expect(await birthProfiles.get()).toBeUndefined()
  })

  it("rejects other actions on the form", async () => {
    const { submit } = await laidOut()
    await expect(submit({ action: "reveal" })).rejects.toMatchObject({ status: 400 })
    await expect(submit({ action: "toss", after: 0 })).rejects.toMatchObject({ status: 400 })
  })

  it("rejects a submit on a set-aside form", async () => {
    const { service, conversationId, emit, submit } = await laidOut()
    await service.sendMessage(conversationId, "Astra, my chart please", emit)
    await expect(submit()).rejects.toMatchObject({ status: 409 })
  })

  it("adds no user message and runs no memory extraction on submit", async () => {
    const extractMemory = vi.fn(async () => [])
    const { submit, stored } = await laidOut({ extractMemory })
    const before = (await stored()).filter((message) => message.senderType === "user").length
    await submit()
    expect((await stored()).filter((message) => message.senderType === "user")).toHaveLength(before)
    expect(extractMemory).not.toHaveBeenCalled()
  })

  it("reads at once on a later request once details are saved", async () => {
    const { submit, service, conversationId, emit, stored } = await laidOut()
    await submit()
    await service.sendMessage(conversationId, "Astra, look at my chart again", emit)
    const last = (await stored()).at(-1)!
    expect(last.interaction).toBeUndefined()
    expect(last.reading).toMatchObject({ method: "natal-transits" })
  })

  it("in a call without details, lays out the form and speaks Astra's invitation", async () => {
    const { service, events, emit } = build()
    const conversation = await service.createConversation([ASTRA])
    await service.sendMessage(conversation.id, "read my chart", emit, { call: true })
    const form = (await store.getConversation(conversation.id))!.messages.at(-1)!
    expect(form.interaction).toMatchObject({ kind: "birth-details", state: "open" })
    expect(form.reading).toBeUndefined()
    expect(events.filter((event) => event.type === "sentence").map((event) => event.text)).toEqual([form.content])
  })

  it("records spans without any birth data", async () => {
    const { submit } = await laidOut()
    await submit()
    const attributes = JSON.stringify(exporter.getFinishedSpans().map((span) => span.attributes))
    for (const leak of ["1990", "12:00", "San Francisco", String(sanFrancisco.id), "37.77"]) expect(attributes).not.toContain(leak)
    expect(attributes).toContain("birth-details")
  })
})
