import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { setTraceProcessors, type Span as AgentsSpan, type Trace as AgentsTrace, type TracingProcessor } from "@openai/agents"
import { createServer, type Server } from "node:http"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { runLocalAgent, streamLocalAgent, type LocalModelConfig } from "../../src/agent/runtime.js"

/** Collects Agents SDK traces and spans instead of sending them to OpenAI. */
class CapturingProcessor implements TracingProcessor {
  traces: AgentsTrace[] = []
  spans: AgentsSpan<never>[] = []
  async onTraceStart(): Promise<void> {}
  async onTraceEnd(trace: AgentsTrace): Promise<void> { this.traces.push(trace) }
  async onSpanStart(): Promise<void> {}
  async onSpanEnd(span: AgentsSpan<never>): Promise<void> { this.spans.push(span) }
  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
}

describe("OpenAI traces for hosted replies (ADR-0022)", () => {
  const otel = new InMemorySpanExporter()
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(otel)] })
  const captured = new CapturingProcessor()
  let server: Server
  const ownerTraceContent = process.env["TRACE_CONTENT"]

  beforeAll(async () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
    trace.setGlobalTracerProvider(provider)
    setTraceProcessors([captured])
    server = createServer(async (request, response) => {
      let body = ""
      for await (const chunk of request) body += chunk
      if (JSON.parse(body).stream === true) {
        response.writeHead(200, { "content-type": "text/event-stream" })
        const chunk = (delta: object, finish: string | null) => `data: ${JSON.stringify({
          id: "chatcmpl-stream", object: "chat.completion.chunk", created: 1, model: "fixture-model",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`
        response.write(chunk({ content: "private reply" }, null))
        response.write(chunk({}, "stop"))
        response.end("data: [DONE]\n\n")
        return
      }
      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify({
        id: "chatcmpl-test", object: "chat.completion", created: 1, model: "fixture-model",
        choices: [{ index: 0, message: { role: "assistant", content: "private reply" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 2, completion_tokens: 2, total_tokens: 4 },
      }))
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  })
  beforeEach(() => { captured.traces = []; captured.spans = []; otel.reset(); delete process.env["TRACE_CONTENT"] })
  afterEach(() => { delete process.env["TRACE_CONTENT"] })
  afterAll(async () => {
    if (ownerTraceContent !== undefined) process.env["TRACE_CONTENT"] = ownerTraceContent
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    await provider.shutdown()
  })

  const baseURL = () => {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")
    return `http://127.0.0.1:${address.port}/v1`
  }
  const local = (): LocalModelConfig => ({ baseURL: baseURL(), model: "fixture-model" })
  const hosted = (openaiTraces?: boolean): LocalModelConfig => ({
    baseURL: baseURL(), model: "hosted-model", apiKey: "sk-hosted", system: "hosted", ...(openaiTraces ? { openaiTraces } : {}),
  })
  const request = { name: "Mira", instructions: "Private instructions.", input: "Private user message." }

  // Ordered: the untraced cases run before any traced run has switched the SDK's global provider on.
  it("creates no Agents SDK trace for local runs or untraced hosted runs", async () => {
    await runLocalAgent(request, local())
    await streamLocalAgent(request, () => undefined, hosted())
    expect(captured.traces).toEqual([])
  })

  it("traces a hosted reply as one named trace, exported with the hosted key and linked to its OTel span", async () => {
    await streamLocalAgent(request, () => undefined, hosted(true))

    expect(captured.traces).toHaveLength(1)
    const traced = captured.traces[0]!
    expect(traced.name).toBe("Oracle teller reply")
    expect(traced.tracingApiKey).toBe("sk-hosted")
    const run = otel.getFinishedSpans().find((span) => span.name === "oracle.agent.run")!
    expect(traced.metadata).toMatchObject({ teller: "Mira", otel_trace_id: run.spanContext().traceId })
  })

  it("keeps local runs untraced after a traced hosted run", async () => {
    await streamLocalAgent(request, () => undefined, hosted(true))
    captured.traces = []
    await runLocalAgent(request, local())
    await streamLocalAgent(request, () => undefined, local())
    expect(captured.traces).toEqual([])
  })

  it("leaves prompts and replies out of the trace unless TRACE_CONTENT is on", async () => {
    await streamLocalAgent(request, () => undefined, hosted(true))
    const off = JSON.stringify(captured.spans.map((span) => span.toJSON()))
    expect(off).not.toContain("Private user message")
    expect(off).not.toContain("private reply")

    captured.spans = []
    process.env["TRACE_CONTENT"] = "1"
    await streamLocalAgent(request, () => undefined, hosted(true))
    const on = JSON.stringify(captured.spans.map((span) => span.toJSON()))
    expect(on).toContain("Private user message")
    expect(on).toContain("private reply")
  })

  it("never puts the hosted key in a trace or span body", async () => {
    await streamLocalAgent(request, () => undefined, hosted(true))
    expect(JSON.stringify([...captured.traces.map((t) => t.toJSON()), ...captured.spans.map((span) => span.toJSON())])).not.toContain("sk-hosted")
  })
})
