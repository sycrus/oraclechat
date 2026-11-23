import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor, type ReadableSpan } from "@opentelemetry/sdk-trace-base"
import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { PostgresChatStore } from "../../src/chat/store.js"
import { ChatService } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import { PostgresMemoryStore } from "../../src/memory/store.js"
import { MemoryService } from "../../src/memory/service.js"

describe("chat turn trace structure", () => {
  const exporter = new InMemorySpanExporter()
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
  const contextManager = new AsyncLocalStorageContextManager()
  let service: ChatService

  beforeAll(() => {
    context.setGlobalContextManager(contextManager.enable())
    trace.setGlobalTracerProvider(provider)
  })

  afterAll(async () => {
    contextManager.disable()
    await provider.shutdown()
  })

  beforeEach(async () => {
    exporter.reset()
    const database = newDb()
    const { Pool: MemoryPool } = database.adapters.createPg()
    const store = new PostgresChatStore(new MemoryPool() as unknown as Pool)
    await store.initialize()
    const memoryStore = new PostgresMemoryStore(new MemoryPool() as unknown as Pool)
    await memoryStore.initialize()
    const memory = new MemoryService(memoryStore)
    await memory.setConsent(true)
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    // This trace covers the immediate-reading path, so Mira is registered without her card fan and Sage without his coin toss.
    const { fan: _fan, ...mira } = registry.get("mira-the-mystic")!
    const { toss: _toss, ...sage } = registry.get("sage-the-seer")!
    const immediate = new TellerRegistry()
    immediate.register(mira)
    immediate.register(sage)
    service = new ChatService({
      store,
      registry: immediate,
      memory,
      extractMemory: async () => [],
      route: async () => [
        { tellerId: "mira-the-mystic", score: 0.9, matchedCategories: [], reading: "named", spread: "three-card", query: "Distinctive search query" },
        { tellerId: "sage-the-seer", score: 0.4, matchedCategories: [], reading: "named" },
      ],
      search: async () => [{ title: "Distinctive result", url: "https://distinctive.example/result", description: "d" }],
      readLink: async (url) => ({ url, title: "Distinctive page", text: "Distinctive page text." }),
      stream: async (_request, onChunk) => { onChunk("Distinctive reply text."); return "Distinctive reply text." },
    })
  })

  const parentOf = (span: ReadableSpan) => span.parentSpanId
  function descendsFrom(span: ReadableSpan, root: ReadableSpan, spans: ReadableSpan[]): boolean {
    let current: ReadableSpan | undefined = span
    while (current && parentOf(current)) {
      if (parentOf(current) === root.spanContext().spanId) return true
      current = spans.find((candidate) => candidate.spanContext().spanId === parentOf(current!))
    }
    return false
  }

  it("records a group turn as one root span with every step beneath it", async () => {
    const conversation = await service.createConversation(["mira-the-mystic", "sage-the-seer"])
    await service.sendMessage(conversation.id, "Distinctive user message. https://distinctive.example/page", () => undefined)

    const spans = exporter.getFinishedSpans()
    const roots = spans.filter((span) => !parentOf(span))
    expect(roots.map((span) => span.name)).toEqual(["oracle.chat.turn"])
    const root = roots[0]!
    expect(root.attributes["langfuse.session.id"]).toBe(conversation.id)
    expect(root.attributes["oracle.turn.teller_count"]).toBe(2)
    expect(root.attributes["oracle.turn.links_read"]).toBe(1)
    expect(root.attributes["oracle.turn.links_failed"]).toBe(0)
    expect(root.attributes["langsmith.metadata.thread_id"]).toBe(conversation.id)
    expect(root.attributes["langsmith.trace.session_id"]).toBeUndefined()
    expect(root.attributes["langsmith.span.kind"]).toBe("chain")

    const names = spans.filter((span) => descendsFrom(span, root, spans)).map((span) => span.name)
    expect(names).toContain("oracle.orchestration.participation")
    expect(names).toContain("oracle.memory.extract")
    const replies = spans.filter((span) => span.name === "oracle.teller.reply")
    expect(replies.map((span) => span.attributes["oracle.teller.id"])).toEqual(["mira-the-mystic", "sage-the-seer"])
    expect(replies.map((span) => span.attributes["oracle.teller.signature_position"])).toEqual(["action", undefined])
    expect(replies.map((span) => span.attributes["oracle.teller.reading"])).toEqual(["tarot", "i-ching"])
    expect(replies.map((span) => span.attributes["oracle.teller.hosted"])).toEqual([false, false])
    expect(replies.map((span) => span.attributes["oracle.teller.searched"])).toEqual([true, false])
    expect(replies[0]!.attributes["oracle.teller.search_results"]).toBe(1)
    expect(replies.every((span) => descendsFrom(span, root, spans))).toBe(true)

    for (const span of spans) {
      const attributes = JSON.stringify(span.attributes)
      expect(attributes).not.toContain("Distinctive user message")
      expect(attributes).not.toContain("Distinctive reply text")
      expect(attributes).not.toContain("Distinctive search query")
      expect(attributes).not.toContain("distinctive.example")
      expect(attributes).not.toContain("Distinctive page")
    }
  })

  it("gives every turn in a conversation the same session", async () => {
    const conversation = await service.createConversation(["mira-the-mystic"])
    await service.sendMessage(conversation.id, "First.", () => undefined)
    await service.sendMessage(conversation.id, "Second.", () => undefined)

    const roots = exporter.getFinishedSpans().filter((span) => span.name === "oracle.chat.turn")
    expect(roots).toHaveLength(2)
    expect(new Set(roots.map((span) => span.attributes["langfuse.session.id"]))).toEqual(new Set([conversation.id]))
  })
})
