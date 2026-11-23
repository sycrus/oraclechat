import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { BasicTracerProvider, BatchSpanProcessor, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { buildExporters, telemetryOptions } from "../../src/observability/otel.js"

describe("configured Langfuse trace export", () => {
  let server: Server | undefined

  afterEach(() => new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve())))

  it("posts completed spans to the Langfuse OTLP endpoint with Basic auth", async () => {
    const requests: { url?: string; auth?: string; body: string }[] = []
    server = createServer((request, response) => {
      let body = ""
      request.on("data", (chunk) => { body += chunk })
      request.on("end", () => {
        requests.push({ url: request.url, auth: request.headers.authorization, body })
        response.writeHead(200, { "Content-Type": "application/json" }).end("{}")
      })
    })
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve))
    const { port } = server.address() as AddressInfo

    const [{ exporter, name }] = buildExporters({
      LANGFUSE_BASEURL: `http://127.0.0.1:${port}`,
      LANGFUSE_PUBLIC_KEY: "pk-test",
      LANGFUSE_SECRET_KEY: "sk-test",
    })
    expect(name).toBe("langfuse-otlp")

    const provider = new BasicTracerProvider()
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
    provider.getTracer("test").startSpan("oracle.test.span").end()
    await provider.forceFlush()
    await provider.shutdown()

    expect(requests).toHaveLength(1)
    expect(requests[0]!.url).toBe("/api/public/otel/v1/traces")
    expect(requests[0]!.auth).toBe(`Basic ${Buffer.from("pk-test:sk-test").toString("base64")}`)
    expect(requests[0]!.body).toContain("oracle.test.span")
  })

  const langfuseEnv = { LANGFUSE_BASEURL: "http://127.0.0.1:1", LANGFUSE_PUBLIC_KEY: "pk", LANGFUSE_SECRET_KEY: "sk" }
  const langsmithEnv = { LANGSMITH_API_KEY: "ls-key" }

  it("falls back to the console exporter without any destination", () => {
    const exporters = buildExporters({})
    expect(exporters.map((entry) => entry.name)).toEqual(["console"])
    expect(exporters[0]!.processor).toBeInstanceOf(SimpleSpanProcessor)
  })

  it("selects Langfuse, LangSmith, or both, each batched", () => {
    expect(buildExporters(langfuseEnv).map((entry) => entry.name)).toEqual(["langfuse-otlp"])
    expect(buildExporters(langsmithEnv).map((entry) => entry.name)).toEqual(["langsmith-otlp"])
    const both = buildExporters({ ...langfuseEnv, ...langsmithEnv })
    expect(both.map((entry) => entry.name)).toEqual(["langfuse-otlp", "langsmith-otlp"])
    expect(both.every((entry) => entry.processor instanceof BatchSpanProcessor)).toBe(true)
  })

  it("posts spans to LangSmith with its API key and project headers", async () => {
    const requests: { url?: string; key?: string; project?: string; body: string }[] = []
    server = createServer((request, response) => {
      let body = ""
      request.on("data", (chunk) => { body += chunk })
      request.on("end", () => {
        requests.push({ url: request.url, key: request.headers["x-api-key"] as string, project: request.headers["langsmith-project"] as string, body })
        response.writeHead(200, { "Content-Type": "application/json" }).end("{}")
      })
    })
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve))
    const { port } = server.address() as AddressInfo

    const [{ exporter, name }] = buildExporters({ LANGSMITH_API_KEY: "ls-key", LANGSMITH_PROJECT: "oracle-test", LANGSMITH_ENDPOINT: `http://127.0.0.1:${port}/` })
    expect(name).toBe("langsmith-otlp")
    const provider = new BasicTracerProvider()
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
    provider.getTracer("test").startSpan("oracle.test.span").end()
    await provider.forceFlush()
    await provider.shutdown()

    expect(requests).toHaveLength(1)
    expect(requests[0]!.url).toBe("/otel/v1/traces")
    expect(requests[0]!.key).toBe("ls-key")
    expect(requests[0]!.project).toBe("oracle-test")
    expect(requests[0]!.body).toContain("oracle.test.span")
  })
})

describe("telemetry resource", () => {
  it("does not attach host, user or process details to exported spans", () => {
    const options = telemetryOptions({})
    expect(options.autoDetectResources).toBe(false)
    expect(options.serviceName).toBe("oracle-agent")
  })
})

describe("withSpan", () => {
  it("records the given attributes, an OK status, and an error status with the message when the work throws", async () => {
    const { context, trace, SpanStatusCode } = await import("@opentelemetry/api")
    const { AsyncLocalStorageContextManager } = await import("@opentelemetry/context-async-hooks")
    const { InMemorySpanExporter } = await import("@opentelemetry/sdk-trace-base")
    const { withSpan } = await import("../../src/observability/otel.js")
    const exporter = new InMemorySpanExporter()
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
    trace.setGlobalTracerProvider(provider)

    await expect(withSpan("oracle.test.ok", { "oracle.teller.id": "mira" }, async () => "done")).resolves.toBe("done")
    await expect(withSpan("oracle.test.fail", {}, async () => { throw new Error("model down") })).rejects.toThrow("model down")
    const [ok, failed] = exporter.getFinishedSpans()
    expect(ok!.attributes).toMatchObject({ "oracle.teller.id": "mira" })
    expect(ok!.status.code).toBe(SpanStatusCode.OK)
    expect(failed!.status).toMatchObject({ code: SpanStatusCode.ERROR, message: "model down" })
    await provider.shutdown()
  })
})
