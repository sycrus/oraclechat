/**
 * Oracle's tracing (ADR-0004). Each chat turn, teller reply, routing call and memory step is an OpenTelemetry span.
 * Spans go to Langfuse and/or LangSmith over OTLP when their settings are present, and to the console otherwise.
 * Resource auto-detection stays off, so host names, OS users and process details never leave the PC with a span.
 */
import { SpanStatusCode, trace, type Attributes, type Span } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { NodeSDK } from "@opentelemetry/sdk-node"
import {
  BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor, type SpanExporter, type SpanProcessor,
} from "@opentelemetry/sdk-trace-base"

type Env = Record<string, string | undefined>

/** Where spans are sent, with the processor that feeds that exporter. */
export interface TraceDestination {
  name: "langfuse-otlp" | "langsmith-otlp" | "console"
  exporter: SpanExporter
  processor: SpanProcessor
}

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, "")

/** Langfuse's OTLP endpoint, authenticated with its public and secret keys as Basic auth. */
function langfuseDestination(env: Env): TraceDestination | null {
  const baseUrl = env["LANGFUSE_BASEURL"], publicKey = env["LANGFUSE_PUBLIC_KEY"], secretKey = env["LANGFUSE_SECRET_KEY"]
  if (!baseUrl || !publicKey || !secretKey) return null
  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString("base64")
  const exporter = new OTLPTraceExporter({
    url: `${withoutTrailingSlash(baseUrl)}/api/public/otel/v1/traces`,
    headers: { Authorization: `Basic ${credentials}` },
  })
  return { name: "langfuse-otlp", exporter, processor: new BatchSpanProcessor(exporter) }
}

/** LangSmith's OTLP endpoint, authenticated with its API key and filed under a project. */
function langsmithDestination(env: Env): TraceDestination | null {
  const apiKey = env["LANGSMITH_API_KEY"]
  if (!apiKey) return null
  const endpoint = withoutTrailingSlash(env["LANGSMITH_ENDPOINT"] ?? "https://api.smith.langchain.com")
  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/otel/v1/traces`,
    headers: { "x-api-key": apiKey, "Langsmith-Project": env["LANGSMITH_PROJECT"] ?? "oracle" },
  })
  return { name: "langsmith-otlp", exporter, processor: new BatchSpanProcessor(exporter) }
}

/** The configured trace destinations, batched; a console printer when none is configured. */
export function buildExporters(env: Env = process.env): TraceDestination[] {
  const remote = [langfuseDestination(env), langsmithDestination(env)].filter((destination) => destination !== null)
  if (remote.length > 0) return remote
  const exporter = new ConsoleSpanExporter()
  return [{ name: "console", exporter, processor: new SimpleSpanProcessor(exporter) }]
}

/** Options for the OpenTelemetry Node SDK, plus the destination names for the startup log. */
export function telemetryOptions(env: Env = process.env) {
  const destinations = buildExporters(env)
  return {
    serviceName: env["OTEL_SERVICE_NAME"] ?? "oracle-agent",
    autoDetectResources: false,
    spanProcessors: destinations.map((destination) => destination.processor),
    exporterNames: destinations.map((destination) => destination.name),
  }
}

/** True when the owner opted in to prompts and replies on model-call spans (TRACE_CONTENT=1 or true). */
export function traceContentEnabled(env: Env = process.env): boolean {
  const value = env["TRACE_CONTENT"]?.trim().toLowerCase()
  return value === "1" || value === "true"
}

let sdk: NodeSDK | undefined

/** Starts tracing for the process; called once by the server before it listens. */
export function initTelemetry(env: Env = process.env): void {
  const { exporterNames, ...options } = telemetryOptions(env)
  sdk = new NodeSDK(options)
  sdk.start()
  console.log(`[otel] Tracing ${options.serviceName} to ${exporterNames.join(" and ")}`)
  if (traceContentEnabled(env)) console.warn("[otel] TRACE_CONTENT is on: prompts and replies are recorded in model-call spans")
}

/** Flushes pending spans and stops tracing, e.g. on SIGTERM. */
export async function shutdownTelemetry(): Promise<void> {
  await sdk?.shutdown()
  sdk = undefined
}

/**
 * Runs `work` inside an active span named `name` with the given attributes. The span ends when the work settles:
 * OK when it resolves, ERROR with the error's message when it throws (the error is rethrown).
 */
export function withSpan<T>(name: string, attributes: Attributes, work: (span: Span) => Promise<T>): Promise<T> {
  return trace.getTracer("oracle").startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await work(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) })
      throw error
    } finally {
      span.end()
    }
  })
}
