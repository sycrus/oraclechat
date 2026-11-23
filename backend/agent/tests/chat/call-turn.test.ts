import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { PostgresChatStore } from "../../src/chat/store.js"
import { CALL_NOTE, ChatService, type ChatEvent } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import type { TurnRoute } from "../../src/orchestration/router.js"
import { NO_CALL_TELLER } from "../tellers/no-call-teller.js"

const MIRA = "mira-the-mystic"
const SAGE = "sage-the-seer"
const REPLY_CHUNKS = ["[happy] Yes, st", "art it. [rel", "axed] One **page** is enough", " for day one"]

const exporter = new InMemorySpanExporter()
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
beforeAll(() => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
  trace.setGlobalTracerProvider(provider)
})
afterAll(() => provider.shutdown())

describe("call turns", () => {
  let store: PostgresChatStore
  let registry: TellerRegistry

  beforeEach(async () => {
    exporter.reset()
    const { Pool: MemoryPool } = newDb().adapters.createPg()
    store = new PostgresChatStore(new MemoryPool() as unknown as Pool)
    await store.initialize()
    registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    registry.register(NO_CALL_TELLER)
  })

  function setup(route: TurnRoute = { tellerId: MIRA, score: 1, matchedCategories: [], reading: "none" }) {
    const inputs: string[] = []
    const instructions: string[] = []
    const events: ChatEvent[] = []
    const service = new ChatService({
      store, registry,
      route: async () => [route],
      stream: async (request, onChunk) => {
        inputs.push(request.input)
        instructions.push(request.instructions)
        for (const chunk of REPLY_CHUNKS) onChunk(chunk)
        return REPLY_CHUNKS.join("")
      },
    })
    return { service, inputs, instructions, events, emit: (event: ChatEvent) => events.push(event) }
  }

  it("asks for spoken, tagged sentences only on call turns", async () => {
    const { service, inputs, instructions, emit } = setup()
    const conversation = await service.createConversation([MIRA])
    await service.sendMessage(conversation.id, "Hi", emit)
    await service.sendMessage(conversation.id, "Should I start the novel?", emit, { call: true })
    expect(inputs[0]).not.toContain(CALL_NOTE)
    expect(inputs[1]!.endsWith(CALL_NOTE)).toBe(true)
    expect(instructions[0]).not.toContain(CALL_NOTE)
    expect(instructions[1]).toContain(CALL_NOTE)
  })

  it("streams sentences in order with their expressions, before the reply completes", async () => {
    const { service, events, emit } = setup()
    const conversation = await service.createConversation([MIRA])
    await service.sendMessage(conversation.id, "Should I start the novel?", emit, { call: true })

    const sentences = events.filter((event) => event.type === "sentence")
    expect(sentences.map(({ text, expression }) => ({ text, expression }))).toEqual([
      { text: "Yes, start it.", expression: "happy" },
      { text: "One page is enough for day one", expression: "relaxed" },
    ])
    expect(sentences.every((event) => event.tellerId === MIRA && event.messageId)).toBe(true)
    const firstSentence = events.findIndex((event) => event.type === "sentence")
    expect(firstSentence).toBeLessThan(events.findIndex((event) => event.type === "message_complete"))
  })

  it("keeps tags out of the streamed chat text and the saved reply", async () => {
    const { service, events, emit } = setup()
    const conversation = await service.createConversation([MIRA])
    await service.sendMessage(conversation.id, "Should I start the novel?", emit, { call: true })

    const streamed = events.filter((event) => event.type === "message_chunk").map((event) => event.text).join("")
    expect(streamed).not.toMatch(/\[[a-z]+\]/)
    expect(streamed).toContain("Yes, start it.")
    const saved = (await store.getConversation(conversation.id))!.messages.at(-1)!
    expect(saved.content).toBe("Yes, start it. One **page** is enough for day one")
  })

  it("leaves ordinary chat turns unchanged", async () => {
    const { service, events, emit } = setup()
    const conversation = await service.createConversation([MIRA])
    await service.sendMessage(conversation.id, "Hi", emit)
    expect(events.some((event) => event.type === "sentence")).toBe(false)
    expect(events.filter((event) => event.type === "message_chunk").map((event) => event.text)).toEqual(REPLY_CHUNKS)
  })

  it.each([
    ["a group conversation", [MIRA, SAGE]],
    ["a teller without calls", [NO_CALL_TELLER.id]],
  ])("rejects a call message to %s before saving anything", async (_label, tellerIds) => {
    const { service, emit } = setup({ tellerId: tellerIds[0]!, score: 1, matchedCategories: [], reading: "none" })
    const conversation = await service.createConversation(tellerIds)
    await expect(service.sendMessage(conversation.id, "Hi", emit, { call: true })).rejects.toThrow("calls")
    expect((await store.getConversation(conversation.id))!.messages).toHaveLength(0)
  })

  it("lays out Mira's fan on a call turn and speaks her invitation", async () => {
    const { service, events, emit } = setup({ tellerId: MIRA, score: 1, matchedCategories: [], reading: "named", spread: "three-card" })
    const conversation = await service.createConversation([MIRA])
    await service.sendMessage(conversation.id, "Read my cards", emit, { call: true })
    const fan = (await store.getConversation(conversation.id))!.messages.at(-1)!
    expect(fan.interaction).toMatchObject({ kind: "card-fan", state: "open" })
    expect(fan.reading).toBeUndefined()
    expect(events.filter((event) => event.type === "sentence")).toEqual([expect.objectContaining({ text: fan.content, messageId: fan.id })])
  })

  it("lays out Sage's coin toss on a call turn and speaks his invitation", async () => {
    const { service, events, emit } = setup({ tellerId: SAGE, score: 1, matchedCategories: [], reading: "named" })
    const conversation = await service.createConversation([SAGE])
    await service.sendMessage(conversation.id, "Cast for me", emit, { call: true })
    const toss = (await store.getConversation(conversation.id))!.messages.at(-1)!
    expect(toss.interaction).toMatchObject({ kind: "coin-toss", state: "casting", lines: [] })
    expect(events.filter((event) => event.type === "sentence").map((event) => event.text)).toEqual([toss.content])
  })

  describe("interactions from a call", () => {
    async function tossedOut() {
      const harness = setup({ tellerId: SAGE, score: 1, matchedCategories: [], reading: "named" })
      const conversation = await harness.service.createConversation([SAGE])
      await harness.service.sendMessage(conversation.id, "Cast for me", harness.emit, { call: true })
      const toss = (await store.getConversation(conversation.id))!.messages.at(-1)!
      for (let after = 0; after < 5; after++) await harness.service.interact(conversation.id, toss.id, { action: "toss", after }, harness.emit)
      harness.events.length = 0
      harness.instructions.length = 0
      return { ...harness, conversationId: conversation.id, tossId: toss.id }
    }

    it("speaks the interpretation after the sixth toss sent from a call, saving it without tags", async () => {
      const { service, events, instructions, emit, conversationId, tossId } = await tossedOut()
      await service.interact(conversationId, tossId, { action: "toss", after: 5, call: true }, emit)
      expect(instructions[0]).toContain(CALL_NOTE)
      expect(events.filter((event) => event.type === "sentence").map((event) => event.text)).toEqual(["Yes, start it.", "One page is enough for day one"])
      const reply = (await store.getConversation(conversationId))!.messages.at(-1)!
      expect(reply.content).not.toMatch(/\[(happy|relaxed)\]/)
    })

    it("interprets in chat style without the call flag", async () => {
      const { service, events, instructions, emit, conversationId, tossId } = await tossedOut()
      await service.interact(conversationId, tossId, { action: "toss", after: 5 }, emit)
      expect(instructions[0]).not.toContain(CALL_NOTE)
      expect(events.some((event) => event.type === "sentence")).toBe(false)
    })

    it("rejects the call flag on a group conversation and changes nothing", async () => {
      const { service, emit } = setup({ tellerId: MIRA, score: 1, matchedCategories: [], reading: "named", spread: "three-card" })
      const conversation = await service.createConversation([MIRA, SAGE])
      await service.sendMessage(conversation.id, "Read my cards", emit)
      const fan = (await store.getConversation(conversation.id))!.messages.find((message) => message.interaction)!
      await expect(service.interact(conversation.id, fan.id, { action: "pick", index: 0, call: true }, emit)).rejects.toMatchObject({ status: 400 })
      expect((await store.getConversation(conversation.id))!.messages.find((message) => message.id === fan.id)!.interaction).toMatchObject({ picks: [] })
    })

    it("rejects a call flag that isn't a boolean", async () => {
      const { service, emit, conversationId, tossId } = await tossedOut()
      await expect(service.interact(conversationId, tossId, { action: "toss", after: 5, call: "yes" }, emit)).rejects.toMatchObject({ status: 400 })
    })
  })

  it("records call metadata on the reply span, never the text", async () => {
    const { service, emit } = setup()
    const conversation = await service.createConversation([MIRA])
    await service.sendMessage(conversation.id, "Should I start the novel?", emit, { call: true })
    await provider.forceFlush()
    const span = exporter.getFinishedSpans().find((item) => item.name === "oracle.teller.reply")!
    expect(span.attributes).toMatchObject({ "oracle.teller.call": true, "oracle.call.sentences": 2 })
    expect(JSON.stringify(span.attributes)).not.toContain("start it")
  })
})
