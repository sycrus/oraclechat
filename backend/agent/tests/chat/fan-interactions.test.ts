import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { PostgresChatStore } from "../../src/chat/store.js"
import { ChatService, type ChatEvent, type ChatServiceOptions } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import type { RouteTurnInput, TurnRoute } from "../../src/orchestration/router.js"

const MIRA = "mira-the-mystic"
const SAGE = "sage-the-seer"

const exporter = new InMemorySpanExporter()
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
beforeAll(() => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
  trace.setGlobalTracerProvider(provider)
})
afterAll(() => provider.shutdown())

describe("card fan interactions", () => {
  let store: PostgresChatStore
  let registry: TellerRegistry

  beforeEach(async () => {
    exporter.reset()
    const { Pool: MemoryPool } = newDb().adapters.createPg()
    store = new PostgresChatStore(new MemoryPool() as unknown as Pool)
    await store.initialize()
    registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
  })

  /** Mira is asked for a reading by any message that says "read"; Sage never is. */
  const route = async (input: RouteTurnInput): Promise<TurnRoute[]> =>
    input.tellers.map((teller, index) => ({ tellerId: teller.id, score: 1 - index * 0.1, matchedCategories: [], reading: teller.id === MIRA && /read/i.test(input.message) ? "named" : "none" }))

  function build(extra: Partial<ChatServiceOptions> = {}) {
    const requests: Array<{ name: string; input: string }> = []
    const events: ChatEvent[] = []
    const service = new ChatService({
      store, registry, route,
      stream: async (request, onChunk) => { requests.push(request); const reply = `${request.name} reads them.`; onChunk(reply); return reply },
      ...extra,
    })
    return { service, requests, events, emit: (event: ChatEvent) => events.push(event) }
  }

  /** A conversation with Mira whose first reading request has laid out a fan. */
  async function laidOut(tellers: string[] = [MIRA], extra: Partial<ChatServiceOptions> = {}) {
    const harness = build(extra)
    const conversation = await harness.service.createConversation(tellers)
    await harness.service.sendMessage(conversation.id, "Mira, read for me", harness.emit)
    const fan = (await store.getConversation(conversation.id))!.messages.find((message) => message.interaction)!
    const names = (): string[] => fan.interaction!.hidden!.map((card) => card.name)
    const pick = (index: number) => harness.service.interact(conversation.id, fan.id, { action: "pick", index }, harness.emit)
    const unpick = (index: number) => harness.service.interact(conversation.id, fan.id, { action: "unpick", index }, harness.emit)
    const reveal = () => harness.service.interact(conversation.id, fan.id, { action: "reveal" }, harness.emit)
    const stored = async () => (await store.getConversation(conversation.id))!.messages
    harness.events.length = 0
    return { ...harness, conversationId: conversation.id, messageId: fan.id, hidden: fan.interaction!.hidden!, names, pick, unpick, reveal, stored }
  }

  describe("picking", () => {
    it("picks and unpicks cards, saving each change", async () => {
      const { pick, unpick, stored } = await laidOut()
      await pick(3); await pick(0); await pick(5)
      expect((await unpick(0)).interaction).toMatchObject({ state: "open", picks: [3, 5] })
      expect((await stored()).find((message) => message.interaction)!.interaction!.picks).toEqual([3, 5])
    })

    it("returns the public message without the hidden cards", async () => {
      const { pick } = await laidOut()
      const message = await pick(1)
      expect(message.interaction).toEqual({ kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [1] })
      expect(JSON.stringify(message)).not.toContain("hidden")
    })

    it("changes nothing for a repeated pick or unpicking a card that is not picked", async () => {
      const { pick, unpick } = await laidOut()
      await pick(2)
      expect((await pick(2)).interaction!.picks).toEqual([2])
      expect((await unpick(7)).interaction!.picks).toEqual([2])
    })

    it("rejects a fourth pick in a three-card fan and keeps the picks", async () => {
      const { pick, stored } = await laidOut()
      await pick(0); await pick(1); await pick(2)
      await expect(pick(3)).rejects.toMatchObject({ status: 409 })
      expect((await stored()).find((message) => message.interaction)!.interaction!.picks).toEqual([0, 1, 2])
    })

    it("rejects an index outside the fan and a bad action", async () => {
      const { service, conversationId, messageId, emit } = await laidOut()
      for (const request of [{ action: "pick", index: 9 }, { action: "pick", index: -1 }, { action: "pick", index: 1.5 }, { action: "pick" }, { action: "shuffle" }, {}]) {
        await expect(service.interact(conversationId, messageId, request, emit)).rejects.toMatchObject({ status: 400 })
      }
    })

    it("rejects an unknown message, a message that is not a fan, and another conversation's fan", async () => {
      const { service, conversationId, messageId, emit, stored } = await laidOut()
      const plain = (await stored()).find((message) => message.senderType === "user")!
      await expect(service.interact(conversationId, "nope", { action: "pick", index: 0 }, emit)).rejects.toMatchObject({ status: 404 })
      await expect(service.interact(conversationId, plain.id, { action: "pick", index: 0 }, emit)).rejects.toMatchObject({ status: 404 })
      const other = await service.createConversation([SAGE])
      await expect(service.interact(other.id, messageId, { action: "pick", index: 0 }, emit)).rejects.toMatchObject({ status: 404 })
    })

    it("rejects picks on a set-aside fan", async () => {
      const { service, conversationId, messageId, pick, emit } = await laidOut()
      await service.sendMessage(conversationId, "Read again", emit)
      await expect(pick(0)).rejects.toMatchObject({ status: 409 })
      expect(messageId).toBeTruthy()
    })

    it("adds no user message and runs no memory extraction", async () => {
      const extractMemory = vi.fn(async () => [])
      const { pick, reveal, stored } = await laidOut([MIRA], { extractMemory })
      const before = (await stored()).filter((message) => message.senderType === "user").length
      await pick(0); await pick(1); await pick(2); await reveal()
      expect((await stored()).filter((message) => message.senderType === "user")).toHaveLength(before)
      expect(extractMemory).not.toHaveBeenCalled()
    })
  })

  describe("revealing", () => {
    it("rejects an early reveal and keeps the fan open", async () => {
      const { pick, reveal, requests, stored } = await laidOut()
      await pick(0); await pick(1)
      await expect(reveal()).rejects.toMatchObject({ status: 409 })
      expect(requests).toHaveLength(0)
      expect((await stored()).find((message) => message.interaction)!.interaction!.state).toBe("open")
    })

    it("deals the picks in pick order with their orientations, then streams the interpretation as a separate reply", async () => {
      const { pick, reveal, hidden, events, stored, requests } = await laidOut()
      await pick(4); await pick(1); await pick(7)
      await reveal()

      const [fan, interpretation] = (await stored()).filter((message) => message.senderType === "teller").slice(0, 2)
      expect(fan!.interaction).toEqual({ kind: "card-fan", state: "revealed", spread: "three-card", size: 9, picks: [4, 1, 7] })
      expect(fan!.reading).toMatchObject({ spread: "three-card" })
      const dealt = (fan!.reading as { cards: Array<{ position: string; name: string; orientation: string }> }).cards
      expect(dealt.map((card) => card.position)).toEqual(["past", "present", "future"])
      expect(dealt.map((card) => card.name)).toEqual([4, 1, 7].map((index) => hidden[index]!.name))
      expect(dealt.map((card) => card.orientation)).toEqual([4, 1, 7].map((index) => hidden[index]!.orientation))
      expect(fan!.signatureCard?.position).toBe("action")
      expect(dealt.map((card) => card.name)).not.toContain(fan!.signatureCard!.name)

      expect(interpretation!.content).toBe("Mira reads them.")
      expect(interpretation!.reading).toBeUndefined()
      expect(interpretation!.signatureCard).toBeUndefined()
      expect(requests).toHaveLength(1)
      expect(requests[0]!.input).toContain(JSON.stringify(fan!.reading))
      expect(requests[0]!.input).toContain("The user picked these cards")

      const update = events.find((event) => event.type === "message_update")!
      expect(update.message!.reading).toEqual(fan!.reading)
      expect(update.message!.signatureCard).toEqual(fan!.signatureCard)
      const order = events.map((event) => event.type)
      expect(order.indexOf("message_update")).toBeLessThan(order.indexOf("message_start"))
      expect(events.find((event) => event.type === "message_start")!.reading).toBeUndefined()
    })

    it("rejects a second reveal without a second interpretation", async () => {
      const { pick, reveal, requests } = await laidOut()
      await pick(0); await pick(1); await pick(2)
      await reveal()
      await expect(reveal()).rejects.toMatchObject({ status: 409 })
      await expect(pick(3)).rejects.toMatchObject({ status: 409 })
      expect(requests).toHaveLength(1)
    })

    it("lets only one of two simultaneous reveals through", async () => {
      const { pick, reveal, requests } = await laidOut()
      await pick(0); await pick(1); await pick(2)
      const results = await Promise.allSettled([reveal(), reveal()])
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
      expect(requests).toHaveLength(1)
    })

    it("keeps the cards revealed, reports the error and saves no partial reply when the model fails", async () => {
      const { pick, reveal, stored } = await laidOut([MIRA], {
        stream: async (_request, onChunk) => { onChunk("Partial"); throw new Error("model down") },
      })
      await pick(0); await pick(1); await pick(2)
      await expect(reveal()).rejects.toThrow("model down")
      const messages = await stored()
      expect(messages.find((message) => message.interaction)!.interaction!.state).toBe("revealed")
      expect(messages.find((message) => message.interaction)!.reading).toBeDefined()
      expect(messages.filter((message) => message.senderType === "teller")).toHaveLength(1)
    })

    it("gives a second teller the dealt reading as Mira's reference, and never an unrevealed fan", async () => {
      const { service, conversationId, pick, reveal, requests, emit, names } = await laidOut([MIRA, SAGE])
      await service.sendMessage(conversationId, "Sage, what do you think so far?", emit)
      for (const request of requests) for (const name of names()) expect(request.input).not.toContain(name)

      await pick(0); await pick(1); await pick(2); await reveal()
      requests.length = 0
      await service.sendMessage(conversationId, "Sage, and now?", emit)
      const sage = requests.find((request) => request.name === "Sage")!
      expect(sage.input).toContain("Reading by Mira (reference; you may react to it, but it isn't yours to interpret as your own)")
    })
  })

  describe("hidden cards", () => {
    it("never appear in any payload before the reveal, and only picked cards and the signature card after", async () => {
      const { service, conversationId, messageId, pick, reveal, hidden, events, emit } = await laidOut()
      const names = hidden.map((card) => card.name)
      const seen: unknown[] = [...events]
      seen.push(await pick(2), await pick(6), await pick(8))
      await service.sendMessage(conversationId, "Read again?", (event) => { seen.push(event); emit(event) }) // sets this fan aside
      seen.push(await service.getConversation(conversationId))
      const before = JSON.stringify(seen)
      expect(before).not.toContain("hidden")
      for (const name of names) expect(before).not.toContain(name)
      expect(messageId).toBeTruthy()

      // A fresh fan, revealed.
      const next = (await store.getConversation(conversationId))!.messages.filter((message) => message.interaction?.state === "open").at(-1)!
      const nextNames = next.interaction!.hidden!.map((card) => card.name)
      const sent: unknown[] = []
      for (const index of [0, 4, 8]) sent.push(await service.interact(conversationId, next.id, { action: "pick", index }, (event) => sent.push(event)))
      await service.interact(conversationId, next.id, { action: "reveal" }, (event) => sent.push(event))
      sent.push(await service.getConversation(conversationId))
      const wire = JSON.stringify(sent)
      expect(wire).not.toContain("hidden")
      const signature = (await store.getConversation(conversationId))!.messages.find((message) => message.id === next.id)!.signatureCard!.name
      for (const [index, name] of nextNames.entries()) {
        if ([0, 4, 8].includes(index)) expect(wire).toContain(name)
        else if (name !== signature) expect(wire).not.toContain(name)
      }
      void reveal
    })
  })

  describe("tracing", () => {
    it("records the kind, teller, action and outcome of each interaction, and no card identities", async () => {
      const { pick, reveal, names, hidden } = await laidOut()
      await pick(0); await pick(1); await pick(2)
      await expect(pick(3)).rejects.toBeDefined()
      await reveal()

      const spans = exporter.getFinishedSpans().filter((span) => span.name === "oracle.interaction")
      expect(spans.map((span) => [span.attributes["oracle.interaction.action"], span.attributes["oracle.interaction.outcome"]])).toEqual([
        ["pick", "ok"], ["pick", "ok"], ["pick", "ok"], ["pick", "rejected"], ["reveal", "ok"],
      ])
      for (const span of spans) {
        expect(span.attributes["oracle.interaction.kind"]).toBe("card-fan")
        expect(span.attributes["oracle.teller.id"]).toBe(MIRA)
      }
      const dump = JSON.stringify(spans.map((span) => span.attributes))
      for (const name of names()) expect(dump).not.toContain(name)
      for (const card of hidden) expect(dump).not.toContain(card.meaning)
      expect(dump).not.toContain("Mira, read for me")
    })
  })
})
