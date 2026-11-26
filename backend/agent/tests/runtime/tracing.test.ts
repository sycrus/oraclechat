import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { createServer, type Server } from "node:http"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { runLocalAgent, streamLocalAgent } from "../../src/agent/runtime.js"
import { traceContentEnabled } from "../../src/observability/otel.js"
import { routeTurn } from "../../src/orchestration/router.js"
import { TellerRegistry } from "../../src/tellers/registry.js"

describe("local agent tracing", () => {
  const exporter = new InMemorySpanExporter()
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  })
  let server: Server
  let reply = "private output"
  // The owner's .env (loaded by tests/setup.ts) may turn trace content on; each test here starts with it off.
  const ownerTraceContent = process.env["TRACE_CONTENT"]
  beforeEach(() => { delete process.env["TRACE_CONTENT"] })
  afterAll(() => { if (ownerTraceContent !== undefined) process.env["TRACE_CONTENT"] = ownerTraceContent })

  beforeAll(async () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
    trace.setGlobalTracerProvider(provider)
    server = createServer(async (request, response) => {
      let body = ""
      for await (const chunk of request) body += chunk
      if (JSON.parse(body).stream === true) {
        response.writeHead(200, { "content-type": "text/event-stream" })
        const chunk = (delta: object, finish: string | null) => `data: ${JSON.stringify({
          id: "chatcmpl-stream", object: "chat.completion.chunk", created: 1, model: "fixture-model",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`
        response.write(chunk({ content: reply.slice(0, 4) }, null))
        response.write(chunk({ content: reply.slice(4) }, null))
        response.write(chunk({}, "stop"))
        response.end("data: [DONE]\n\n")
        return
      }
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

  describe("opt-in trace content (TRACE_CONTENT)", () => {
    const request = { name: "Fixture teller", instructions: "Private instructions.", input: "Private user message." }
    const config = () => {
      const address = server.address()
      if (!address || typeof address === "string") throw new Error("Expected a TCP address")
      return { baseURL: `http://127.0.0.1:${address.port}/v1`, model: "fixture-model" }
    }
    const runSpan = () => exporter.getFinishedSpans().find((span) => span.name === "oracle.agent.run")!
    afterEach(() => { delete process.env["TRACE_CONTENT"] })

    it("records the input and reply of a completed run when TRACE_CONTENT=1", async () => {
      process.env["TRACE_CONTENT"] = "1"
      exporter.reset()
      reply = "private output"

      await runLocalAgent(request, config())

      expect(JSON.parse(String(runSpan().attributes["langfuse.observation.input"]))).toEqual([
        { role: "system", content: "Private instructions." },
        { role: "user", content: "Private user message." },
      ])
      expect(runSpan().attributes["langfuse.observation.output"]).toBe("private output")
    })

    it("records the full text of a streamed reply when TRACE_CONTENT=1", async () => {
      process.env["TRACE_CONTENT"] = "1"
      exporter.reset()
      reply = "streamed private output"

      await streamLocalAgent(request, () => undefined, config())

      expect(String(runSpan().attributes["langfuse.observation.input"])).toContain("Private user message.")
      expect(runSpan().attributes["langfuse.observation.output"]).toBe("streamed private output")
    })

    it("records no content for any other value", async () => {
      for (const value of ["0", "", "yes"]) {
        process.env["TRACE_CONTENT"] = value
        exporter.reset()
        reply = "private output"

        await runLocalAgent(request, config())
        await streamLocalAgent(request, () => undefined, config())

        const attributes = JSON.stringify(exporter.getFinishedSpans().map((span) => span.attributes))
        expect(attributes).not.toContain("Private user message")
        expect(attributes).not.toContain("Private instructions")
        expect(attributes).not.toContain("private output")
      }
    })

    it("accepts only 1 or true, ignoring case and spaces", () => {
      for (const value of ["1", "true", " TRUE "]) expect(traceContentEnabled({ TRACE_CONTENT: value })).toBe(true)
      for (const value of [undefined, "", "0", "yes", "false"]) expect(traceContentEnabled({ TRACE_CONTENT: value })).toBe(false)
    })
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
