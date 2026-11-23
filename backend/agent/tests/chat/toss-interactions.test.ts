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

const SAGE = "sage-the-seer"

const exporter = new InMemorySpanExporter()
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
beforeAll(() => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
  trace.setGlobalTracerProvider(provider)
})
afterAll(() => provider.shutdown())

describe("coin toss interactions", () => {
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

  /** Sage is asked for a reading by any message that says "cast"; Mira never is. */
  const route = async (input: RouteTurnInput): Promise<TurnRoute[]> =>
    input.tellers.map((teller, index) => ({ tellerId: teller.id, score: 1 - index * 0.1, matchedCategories: [], reading: teller.id === SAGE && /cast/i.test(input.message) ? "named" : "none" }))

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

  /** A conversation with Sage whose first reading request has laid out a coin toss. */
  async function laidOut(extra: Partial<ChatServiceOptions> = {}) {
    const harness = build(extra)
    const conversation = await harness.service.createConversation([SAGE])
    await harness.service.sendMessage(conversation.id, "Sage, cast for me", harness.emit)
    const toss = (await store.getConversation(conversation.id))!.messages.find((message) => message.interaction)!
    const remaining = (): number[] => toss.interaction!.remaining!
    let tossed = 0
    /** An up-to-date client: each toss names the number of lines it sees. */
    const tossOnce = () => harness.service.interact(conversation.id, toss.id, { action: "toss", after: tossed }, harness.emit).then((message) => { tossed += 1; return message })
    const tossAfter = (after: number) => harness.service.interact(conversation.id, toss.id, { action: "toss", after }, harness.emit)
    const stored = async () => (await store.getConversation(conversation.id))!.messages
    harness.events.length = 0
    return { ...harness, conversationId: conversation.id, messageId: toss.id, remaining, tossed: () => tossed, tossOnce, tossAfter, stored }
  }

  describe("tossing", () => {
    it("reveals exactly one pre-cast line per toss, bottom to top", async () => {
      const { tossOnce, remaining, stored } = await laidOut()
      await tossOnce(); await tossOnce(); await tossOnce()

      const interaction = (await stored()).find((message) => message.interaction)!.interaction!
      expect(interaction.state).toBe("casting")
      expect(interaction.lines.map((line) => line.value)).toEqual(remaining().slice(0, 3))
      for (const line of interaction.lines) {
        expect(line.yang).toBe(line.value % 2 === 1)
        expect(line.changing).toBe(line.value === 6 || line.value === 9)
      }
    })

    it("returns the public message without the throws still to come", async () => {
      const { tossOnce } = await laidOut()
      const message = await tossOnce()
      expect(message.interaction).toEqual({
        kind: "coin-toss", state: "casting",
        lines: [{ value: message.interaction!.lines[0]!.value, yang: message.interaction!.lines[0]!.yang, changing: message.interaction!.lines[0]!.changing }],
      })
      expect(JSON.stringify(message)).not.toContain("remaining")
    })

    it("rejects a toss whose count is out of date, and leaves the cast unchanged", async () => {
      const { tossOnce, tossAfter, stored } = await laidOut()
      await tossOnce()
      await expect(tossAfter(0)).rejects.toMatchObject({ status: 409 })
      expect((await stored()).find((message) => message.interaction)!.interaction!.lines).toHaveLength(1)
    })

    it("rejects a toss on a revealed or set-aside cast", async () => {
      const { tossOnce, tossAfter, service, conversationId, messageId, emit } = await laidOut()
      for (let index = 0; index < 6; index += 1) await tossOnce()
      await expect(tossAfter(6)).rejects.toMatchObject({ status: 409 })
      await service.sendMessage(conversationId, "Cast again", emit)
      await expect(tossAfter(6)).rejects.toMatchObject({ status: 409 })
      void messageId
    })

    it("rejects an unknown message and a message that is not a coin toss", async () => {
      const { service, conversationId, emit, stored } = await laidOut()
      const plain = (await stored()).find((message) => message.senderType === "user")!
      await expect(service.interact(conversationId, "nope", { action: "toss", after: 0 }, emit)).rejects.toMatchObject({ status: 404 })
      await expect(service.interact(conversationId, plain.id, { action: "toss", after: 0 }, emit)).rejects.toMatchObject({ status: 404 })
    })

    it("rejects a malformed toss", async () => {
      const { service, conversationId, messageId, emit } = await laidOut()
      for (const request of [{ action: "toss" }, { action: "toss", after: -1 }, { action: "toss", after: 1.5 }, { action: "shuffle", after: 0 }, {}]) {
        await expect(service.interact(conversationId, messageId, request, emit)).rejects.toMatchObject({ status: 400 })
      }
    })

    it("adds no user message and runs no memory extraction", async () => {
      const extractMemory = vi.fn(async () => [])
      const { tossOnce, stored } = await laidOut({ extractMemory })
      const before = (await stored()).filter((message) => message.senderType === "user").length
      await tossOnce()
      expect((await stored()).filter((message) => message.senderType === "user")).toHaveLength(before)
      expect(extractMemory).not.toHaveBeenCalled()
    })
  })

  describe("completing the cast", () => {
    it("reveals on the sixth toss, saves the reading and streams the interpretation as a separate reply", async () => {
      const { tossOnce, lines, remaining, events, stored, requests } = await laidOut()
      for (let index = 0; index < 6; index += 1) await tossOnce()

      const [cast, interpretation] = (await stored()).filter((message) => message.senderType === "teller").slice(0, 2)
      expect(cast!.interaction).toMatchObject({ kind: "coin-toss", state: "revealed" })
      expect(cast!.interaction!.lines.map((line) => line.value)).toEqual(remaining())
      expect(cast!.reading).toMatchObject({ method: "i-ching", lines: cast!.interaction!.lines })
      expect(cast!.reading!.primary.number).toBeGreaterThan(0)
      expect(Boolean(cast!.reading!.relating)).toBe(cast!.interaction!.lines.some((line) => line.changing))
      expect(cast!.interaction).not.toHaveProperty("remaining")

      expect(interpretation!.content).toBe("Sage reads them.")
      expect(interpretation!.reading).toBeUndefined()
      expect(requests).toHaveLength(1)
      expect(requests[0]!.input).toContain(JSON.stringify(cast!.reading))
      expect(requests[0]!.input).toContain("The user cast these coins")

      const update = events.find((event) => event.type === "message_update")!
      expect(update.message!.reading).toEqual(cast!.reading)
      const order = events.map((event) => event.type)
      expect(order.indexOf("message_update")).toBeLessThan(order.indexOf("message_start"))
      expect(events.find((event) => event.type === "message_start")!.reading).toBeUndefined()
      void lines
    })

    it("keeps the cast revealed, reports the error and saves no partial reply when the model fails", async () => {
      const { tossOnce, stored } = await laidOut({
        stream: async (_request, onChunk) => { onChunk("Partial"); throw new Error("model down") },
      })
      for (let index = 0; index < 5; index += 1) await tossOnce()
      await expect(tossOnce()).rejects.toThrow("model down")

      const messages = await stored()
      expect(messages.find((message) => message.interaction)!.interaction!.state).toBe("revealed")
      expect(messages.find((message) => message.interaction)!.reading).toBeDefined()
      expect(messages.filter((message) => message.senderType === "teller")).toHaveLength(1)
    })

    it("rejects a toss after the cast is complete, without a second interpretation", async () => {
      const { tossOnce, tossAfter, requests } = await laidOut()
      for (let index = 0; index < 6; index += 1) await tossOnce()
      await expect(tossAfter(6)).rejects.toMatchObject({ status: 409 })
      expect(requests).toHaveLength(1)
    })
  })
})
