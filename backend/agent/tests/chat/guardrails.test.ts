import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { newDb } from "pg-mem"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { Pool } from "pg"
import { PostgresChatStore } from "../../src/chat/store.js"
import { ChatService, type ChatEvent, type ChatServiceOptions } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import { PostgresMemoryStore } from "../../src/memory/store.js"
import { MemoryService } from "../../src/memory/service.js"
import type { TurnRoute } from "../../src/orchestration/router.js"
import { loadGuardrailsConfig } from "../../src/guardrails/config.js"
import { GuardrailError, type Guardrails, type InputVerdict } from "../../src/guardrails/types.js"
import { CARE_NOTE, GUARD_REFUSAL, GUARD_STAND_IN, SUPPORT_TEXT } from "../../src/guardrails/texts.js"
import type { AgentRequest } from "../../src/agent/runtime.js"

const MIRA = "mira-the-mystic"
const SAGE = "sage-the-seer"

const exporter = new InMemorySpanExporter()
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
beforeAll(() => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
  trace.setGlobalTracerProvider(provider)
})
afterAll(() => provider.shutdown())

const DOOMED = "The cards lean your way. Take one step this week. The relationship is doomed. Nothing will save it."

/** Streams a reply a sentence at a time, stopping when aborted, like the real runtime. */
function sentenceStream(reply: string) {
  const runs: Array<{ request: AgentRequest; aborted: boolean }> = []
  const stream = async (request: AgentRequest, onChunk: (chunk: string) => void) => {
    const run = { request, aborted: false }
    runs.push(run)
    let output = ""
    for (const piece of reply.match(/[^.!?]+[.!?]+\s*/g) ?? []) {
      if (request.signal?.aborted) { run.aborted = true; break }
      output += piece
      onChunk(piece)
      await new Promise((resolve) => setTimeout(resolve, 2))
    }
    return output
  }
  return { stream, runs }
}

/** Guardrails that fail sentences matching `fails`, recording every check input. */
function fakeGuardrails({ input = { outcome: "pass" }, fails = /doomed|never recover/i, inputError = false, sentenceError }: {
  input?: InputVerdict; fails?: RegExp; inputError?: boolean; sentenceError?: RegExp
} = {}) {
  const inputs: string[] = []
  const sentences: Array<{ sentence: string; replySoFar: string }> = []
  const guardrails: Guardrails = {
    checkInput: async (text) => { inputs.push(text); if (inputError) throw new GuardrailError("Moderation returned 503"); return input },
    checkSentence: async (sentence, replySoFar) => {
      sentences.push({ sentence, replySoFar })
      if (sentenceError?.test(sentence)) throw new GuardrailError("Ethics check timed out")
      return fails.test(sentence) ? { outcome: "fail", check: "ethics", category: "fatalism" } : { outcome: "pass" }
    },
  }
  return { guardrails, inputs, sentences }
}

const chunksOf = (events: ChatEvent[]) => events.filter((event) => event.type === "message_chunk").map((event) => event.text).join("")

function routes(...entries: Array<Partial<TurnRoute> & { tellerId: string }>): TurnRoute[] {
  return entries.map((entry, index) => ({ score: 1 - index * 0.1, matchedCategories: [], reading: "none", ...entry }))
}

describe("guardrails in chat turns", () => {
  let store: PostgresChatStore
  let registry: TellerRegistry
  let memory: MemoryService

  beforeEach(async () => {
    exporter.reset()
    const database = newDb()
    const { Pool: MemoryPool } = database.adapters.createPg()
    store = new PostgresChatStore(new MemoryPool() as unknown as Pool)
    await store.initialize()
    const memoryStore = new PostgresMemoryStore(new MemoryPool() as unknown as Pool)
    await memoryStore.initialize()
    memory = new MemoryService(memoryStore)
    registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
  })

  afterEach(() => { vi.unstubAllGlobals() })

  function service(extra: Partial<ChatServiceOptions> = {}) {
    const events: ChatEvent[] = []
    const chat = new ChatService({
      store, registry,
      route: async () => routes({ tellerId: MIRA, reading: "named" }, { tellerId: SAGE }),
      stream: async (_request, onChunk) => { const reply = "The cards lean your way. Take one step this week."; onChunk(reply); return reply },
      ...extra,
    })
    return { chat, events, emit: (event: ChatEvent) => events.push(event) }
  }

  it("plain start makes no guardrail call during a full turn, even with guardrail variables set", async () => {
    const fetch = vi.fn(async () => new Response("{}"))
    vi.stubGlobal("fetch", fetch)
    const config = loadGuardrailsConfig(["node", "dist/server.js"], { OPENAI_GUARDRAILS_API_KEY: "sk-guard", OPENAI_GUARDRAILS_MODEL: "gpt-small" })
    expect(config).toBeUndefined()

    await memory.setConsent(true)
    const { chat, emit, events } = service({ memory, extractMemory: async () => [] })
    const conversation = await chat.createConversation([MIRA, SAGE])
    await chat.sendMessage(conversation.id, "Will my new job work out?", emit)

    expect(events.filter((event) => event.type === "message_complete")).toHaveLength(2)
    expect(fetch).not.toHaveBeenCalled()
  })

  describe("reply sentences", () => {
    it("shows and saves the sentences before a fatalistic one, never that sentence or later text, and stops the stream", async () => {
      const { stream, runs } = sentenceStream(DOOMED)
      const { chat, emit, events } = service({ stream, guardrails: fakeGuardrails().guardrails, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await chat.sendMessage(conversation.id, "Will we stay together?", emit)

      expect(chunksOf(events)).not.toMatch(/doomed|Nothing will/)
      expect(chunksOf(events).trim()).toBe("The cards lean your way. Take one step this week.")
      expect(events.some((event) => event.type === "sentence")).toBe(false)
      expect(runs[0]!.aborted).toBe(true)
      expect((await store.getConversation(conversation.id))!.messages.at(-1)!.content).toBe("The cards lean your way. Take one step this week.")
    })

    it("keeps a passing reply's paragraph breaks and markdown, while checks see plain sentences", async () => {
      const reply = "**The Tower** is upright.\n\nIt shakes loose what wasn't working.\n\n- Rest this week.\n- Then decide."
      const stream = async (_request: AgentRequest, onChunk: (chunk: string) => void) => {
        for (const piece of reply.match(/[\s\S]{1,7}/g)!) onChunk(piece)
        return reply
      }
      const checks = fakeGuardrails()
      const { chat, emit, events } = service({ stream, guardrails: checks.guardrails, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await chat.sendMessage(conversation.id, "What does the Tower mean for me?", emit)

      expect(chunksOf(events).trim()).toBe(reply)
      expect((await store.getConversation(conversation.id))!.messages.at(-1)!.content).toBe(reply)
      expect(checks.sentences[0]!.sentence).toBe("The Tower is upright.")
    })

    it("keeps paragraph breaks in a cut reply up to the last passing sentence", async () => {
      const { stream } = sentenceStream("The cards lean your way.\n\nTake one step this week. The relationship is doomed. Nothing will save it.")
      const { chat, emit } = service({ stream, guardrails: fakeGuardrails().guardrails, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await chat.sendMessage(conversation.id, "Will we stay together?", emit)

      expect((await store.getConversation(conversation.id))!.messages.at(-1)!.content).toBe("The cards lean your way.\n\nTake one step this week.")
    })

    it("saves the app-written stand-in when the first sentence fails", async () => {
      const { stream } = sentenceStream("You will never recover. Rest now.")
      const { chat, emit, events } = service({ stream, guardrails: fakeGuardrails().guardrails, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await chat.sendMessage(conversation.id, "How is my health?", emit)

      expect(chunksOf(events).trim()).toBe(GUARD_STAND_IN)
      expect((await store.getConversation(conversation.id))!.messages.at(-1)!.content).toBe(GUARD_STAND_IN)
    })

    it("speaks only released sentences in a call", async () => {
      const { stream } = sentenceStream("[happy] The cards lean your way. [sad] The relationship is doomed. [relaxed] Bye.")
      const { chat, emit, events } = service({ stream, guardrails: fakeGuardrails().guardrails, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await chat.sendMessage(conversation.id, "Will we stay together?", emit, { call: true })

      expect(events.filter((event) => event.type === "sentence").map((event) => [event.text, event.expression])).toEqual([["The cards lean your way.", "happy"]])
      expect((await store.getConversation(conversation.id))!.messages.at(-1)!.content).toBe("The cards lean your way.")
    })

    it("gates the interpretation of a revealed fan too, and never sends the reading, memories or history to a check", async () => {
      const { stream } = sentenceStream(DOOMED)
      const checks = fakeGuardrails()
      await memory.setConsent(true)
      const { chat, emit, events } = service({ stream, guardrails: checks.guardrails, memory, route: async () => routes({ tellerId: MIRA, reading: "named" }) })
      const conversation = await chat.createConversation([MIRA])
      await memory.apply([{ op: "add", content: "Works as a nurse", kind: "core", entities: [] }], conversation.id)
      await chat.sendMessage(conversation.id, "Mira, read for me", emit)
      const fan = (await store.getConversation(conversation.id))!.messages.find((message) => message.interaction)!
      for (const index of [0, 1, 2]) await chat.interact(conversation.id, fan.id, { action: "pick", index }, emit)
      events.length = 0
      await chat.interact(conversation.id, fan.id, { action: "reveal" }, emit)

      expect(chunksOf(events)).not.toContain("doomed")
      const sent = JSON.stringify(checks.sentences)
      expect(sent).not.toContain("Works as a nurse")
      expect(sent).not.toContain("Mira, read for me")
      for (const card of fan.interaction!.hidden!) expect(sent).not.toContain(card.name)
      expect(checks.sentences.map((check) => check.sentence)).toEqual(["The cards lean your way.", "Take one step this week.", "The relationship is doomed."])
    })

    it("fails closed when a sentence check errors: the turn ends with an error and that sentence is never shown", async () => {
      const { stream } = sentenceStream("The cards lean your way. Take one step. A third thought follows. More.")
      const { chat, emit, events } = service({ stream, guardrails: fakeGuardrails({ sentenceError: /third/ }).guardrails, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await expect(chat.sendMessage(conversation.id, "Hi", emit)).rejects.toBeInstanceOf(GuardrailError)

      expect(chunksOf(events)).not.toContain("third")
      expect((await store.getConversation(conversation.id))!.messages.map((message) => message.senderType)).toEqual(["user"])
    })
  })

  describe("user message check", () => {
    /** A two-teller conversation in which Mira spoke last, so Sage is least recently spoken. */
    async function miraSpokeLast(chat: ChatService) {
      const conversation = await chat.createConversation([MIRA, SAGE])
      await store.appendMessage({ id: "u0", conversationId: conversation.id, senderType: "user", senderId: "local-user", content: "Hello" })
      await store.appendMessage({ id: "t0", conversationId: conversation.id, senderType: "teller", senderId: SAGE, content: "Welcome." })
      await store.appendMessage({ id: "t1", conversationId: conversation.id, senderType: "teller", senderId: MIRA, content: "Hi!" })
      return conversation
    }

    it("turns a self-harm signal into a care turn: one least-recently-spoken teller, no routing, reading, lookup or memory, then support text", async () => {
      let routed = 0
      let searched = 0
      let extracted = 0
      await memory.setConsent(true)
      const { stream, runs } = sentenceStream("I'm really glad you told me. You matter.")
      const { chat, emit, events } = service({
        stream, memory,
        guardrails: fakeGuardrails({ input: { outcome: "care", category: "self-harm" } }).guardrails,
        route: async () => { routed += 1; return routes({ tellerId: MIRA, reading: "named", query: "q" }, { tellerId: SAGE, reading: "named" }) },
        search: async () => { searched += 1; return [] },
        extractMemory: async () => { extracted += 1; return [] },
      })
      const conversation = await miraSpokeLast(chat)
      await chat.sendMessage(conversation.id, "I don't want to be here anymore", emit)

      expect(routed).toBe(0)
      expect(searched).toBe(0)
      expect(extracted).toBe(0)
      expect(runs.map((run) => run.request.name)).toEqual(["Sage"])
      expect(runs[0]!.request.instructions).toContain(CARE_NOTE)
      expect(runs[0]!.request.input).toContain(CARE_NOTE)
      const complete = events.filter((event) => event.type === "message_complete").map((event) => event.message!)
      expect(complete.map((message) => [message.senderId, message.content])).toEqual([[SAGE, "I'm really glad you told me. You matter."], [SAGE, SUPPORT_TEXT]])
      expect(complete.every((message) => !message.reading && !message.interaction)).toBe(true)
    })

    it("shows the support text in the chat, unspoken, during a call", async () => {
      const { stream } = sentenceStream("[relaxed] I'm glad you told me.")
      const { chat, emit, events } = service({ stream, guardrails: fakeGuardrails({ input: { outcome: "care", category: "self-harm" } }).guardrails })
      const conversation = await chat.createConversation([MIRA])
      await chat.sendMessage(conversation.id, "I want to hurt myself", emit, { call: true })

      expect(events.filter((event) => event.type === "sentence").map((event) => event.text)).toEqual(["I'm glad you told me."])
      expect(events.filter((event) => event.type === "message_complete").at(-1)!.message!.content).toBe(SUPPORT_TEXT)
    })

    it("refuses with an app-written message and no model call", async () => {
      let routed = 0
      const { stream, runs } = sentenceStream("Never.")
      const { chat, emit, events } = service({ stream, guardrails: fakeGuardrails({ input: { outcome: "refuse", category: "sexual/minors" } }).guardrails, route: async () => { routed += 1; return [] } })
      const conversation = await chat.createConversation([MIRA, SAGE])
      await chat.sendMessage(conversation.id, "refused content", emit)

      expect(routed).toBe(0)
      expect(runs).toHaveLength(0)
      expect(events.filter((event) => event.type === "message_complete").map((event) => event.message!.content)).toEqual([GUARD_REFUSAL])
    })

    it("ends the turn with an error before routing when the check fails", async () => {
      let routed = 0
      const { stream, runs } = sentenceStream("Hi.")
      const { chat, emit } = service({ stream, guardrails: fakeGuardrails({ inputError: true }).guardrails, route: async () => { routed += 1; return [] } })
      const conversation = await chat.createConversation([MIRA])
      await expect(chat.sendMessage(conversation.id, "Hello", emit)).rejects.toBeInstanceOf(GuardrailError)
      expect(routed).toBe(0)
      expect(runs).toHaveLength(0)
    })

    it("sends only the user's message text to the input check", async () => {
      const checks = fakeGuardrails()
      await memory.setConsent(true)
      const { chat, emit } = service({ stream: sentenceStream("Fine.").stream, guardrails: checks.guardrails, memory, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await memory.apply([{ op: "add", content: "Works as a nurse", kind: "core", entities: [] }], conversation.id)
      await chat.sendMessage(conversation.id, "  Will my new job work out?  ", emit)
      expect(checks.inputs).toEqual(["Will my new job work out?"])
    })
  })

  describe("traces", () => {
    it("record check outcomes and categories, never text or the key", async () => {
      const { stream } = sentenceStream(DOOMED)
      const { chat, emit } = service({ stream, guardrails: fakeGuardrails().guardrails, route: async () => routes({ tellerId: MIRA }) })
      const conversation = await chat.createConversation([MIRA])
      await chat.sendMessage(conversation.id, "Will we stay together?", emit)

      const spans = exporter.getFinishedSpans()
      expect(spans.find((span) => span.name === "oracle.guardrail.input")!.attributes).toMatchObject({ "oracle.guardrail.outcome": "pass" })
      const sentences = spans.filter((span) => span.name === "oracle.guardrail.sentence").map((span) => span.attributes)
      expect(sentences.find((attributes) => attributes["oracle.guardrail.outcome"] === "fail"))
        .toMatchObject({ "oracle.guardrail.index": 2, "oracle.guardrail.check": "ethics", "oracle.guardrail.category": "fatalism" })
      expect(spans.find((span) => span.name === "oracle.teller.reply")!.attributes).toMatchObject({ "oracle.teller.guard_outcome": "cut" })
      const recorded = JSON.stringify(spans.filter((span) => span.name.startsWith("oracle.guardrail") || span.name === "oracle.teller.reply").map((span) => span.attributes))
      expect(recorded).not.toMatch(/doomed|lean your way|stay together|sk-/)
    })
  })
})
