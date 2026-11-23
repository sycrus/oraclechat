import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { createServer, type Server } from "node:http"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { runLocalAgent } from "../../src/agent/runtime.js"
import { routeTurn } from "../../src/orchestration/router.js"
import { TellerRegistry } from "../../src/tellers/registry.js"

describe("local agent tracing", () => {
  const exporter = new InMemorySpanExporter()
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  })
  let server: Server
  let reply = "private output"

  beforeAll(async () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
    trace.setGlobalTracerProvider(provider)
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion",
        created: 1,
        model: "fixture-model",
        choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
        usage: { prompt_tokens: 2, completion_tokens: 2, total_tokens: 4 },
      }))
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    await provider.shutdown()
  })

  it("creates an OTel span without recording prompts or model content", async () => {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")

    await runLocalAgent({
      name: "Fixture teller",
      instructions: "Private instructions.",
      input: "Private user message.",
    }, {
      baseURL: `http://127.0.0.1:${address.port}/v1`,
      model: "fixture-model",
    })
    await provider.forceFlush()

    const spans = exporter.getFinishedSpans()
    expect(spans.some((span) => span.name === "oracle.agent.run")).toBe(true)
    for (const span of spans) {
      expect(JSON.stringify(span.attributes)).not.toContain("Private user message")
      expect(JSON.stringify(span.attributes)).not.toContain("Private instructions")
      expect(JSON.stringify(span.attributes)).not.toContain("private output")
    }
  })

  it("marks model runs as generations with the model name and token usage", async () => {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")
    exporter.reset()
    reply = "private output"

    await runLocalAgent({ name: "Fixture teller", instructions: "Private instructions.", input: "Private user message." },
      { baseURL: `http://127.0.0.1:${address.port}/v1`, model: "fixture-model" })

    const run = exporter.getFinishedSpans().find((span) => span.name === "oracle.agent.run")!
    expect(run.attributes["langfuse.observation.type"]).toBe("generation")
    expect(run.attributes["gen_ai.system"]).toBe("ollama")
    expect(run.attributes["langsmith.span.kind"]).toBe("llm")
    expect(run.attributes["gen_ai.request.model"]).toBe("fixture-model")
    expect(run.attributes["oracle.agent.name"]).toBe("Fixture teller")
    expect(run.attributes["gen_ai.usage.input_tokens"]).toBe(2)
    expect(run.attributes["gen_ai.usage.output_tokens"]).toBe(2)
  })

  it("labels hosted generations and never records the hosted key", async () => {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")
    exporter.reset()
    reply = "hosted output"

    await runLocalAgent({ name: "Fixture teller", instructions: "i", input: "x" },
      { baseURL: `http://127.0.0.1:${address.port}/v1`, model: "hosted-model", apiKey: "sk-very-secret", system: "hosted" })

    const run = exporter.getFinishedSpans().find((span) => span.name === "oracle.agent.run")!
    expect(run.attributes["gen_ai.system"]).toBe("hosted")
    expect(run.attributes["gen_ai.request.model"]).toBe("hosted-model")
    expect(JSON.stringify(exporter.getFinishedSpans().map((span) => span.attributes))).not.toContain("sk-very-secret")
  })

  it("nests the router's model call inside the routing span", async () => {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")
    exporter.reset()
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    const tellers = [registry.get("mira-the-mystic")!, registry.get("sage-the-seer")!]
    reply = JSON.stringify(tellers.map((teller) => ({ tellerId: teller.id, score: 0.5, matchedCategories: [] })))

    await routeTurn({ message: "Hello", tellers, previousReplies: [] }, { baseURL: `http://127.0.0.1:${address.port}/v1`, model: "fixture-model" })

    const spans = exporter.getFinishedSpans()
    const rank = spans.find((span) => span.name === "oracle.orchestration.route")!
    const run = spans.find((span) => span.name === "oracle.agent.run")!
    expect(run.parentSpanId).toBe(rank.spanContext().spanId)
  })
})
