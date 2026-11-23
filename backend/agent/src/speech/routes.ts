import { SpanStatusCode, trace } from "@opentelemetry/api"
import express, { type Express } from "express"
import type { TellerRegistry } from "../tellers/registry.js"
import { SpeechUnavailableError, type SpeechClient } from "./client.js"

export interface SpeechRouteOptions {
  /** Absent when TTS_BASE_URL is unset: every request is "voice offline". */
  client?: SpeechClient
  tellers: TellerRegistry
}

const MAX_CHARS = 500
const MAX_AUDIO_MS = 30_000

/** Duration of a PCM WAV from its header, or null if the body is not a WAV with samples. */
export function wavDurationMs(body: Uint8Array): number | null {
  const bytes = Buffer.from(body.buffer, body.byteOffset, body.byteLength)
  if (bytes.length < 12 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") return null
  let byteRate = 0
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = bytes.toString("ascii", offset, offset + 4)
    const size = bytes.readUInt32LE(offset + 4)
    if (id === "fmt " && offset + 16 <= bytes.length) byteRate = bytes.readUInt32LE(offset + 16)
    if (id === "data") return byteRate > 0 && size > 0 ? (Math.min(size, bytes.length - offset - 8) / byteRate) * 1000 : null
    offset += 8 + size + (size % 2)
  }
  return null
}
const tracer = trace.getTracer("oracle-agent")

/** Local speech for video calls (ADR-0015): no fallback voice, and spans never hold the text. */
export function registerSpeechRoutes(app: Express, { client, tellers }: SpeechRouteOptions): void {
  app.post("/api/tts", (request, response) => tracer.startActiveSpan("oracle.tts", async (span) => {
    const done = (outcome: "ok" | "offline" | "rejected") => {
      span.setAttribute("oracle.tts.outcome", outcome)
      if (outcome === "offline") span.setStatus({ code: SpanStatusCode.ERROR, message: "voice offline" })
      span.end()
    }
    const { tellerId, text } = request.body ?? {}
    if (typeof tellerId === "string") span.setAttribute("oracle.teller.id", tellerId)
    if (typeof text !== "string" || !text.trim() || text.length > MAX_CHARS) {
      response.status(400).json({ error: `text must be 1-${MAX_CHARS} characters` }); done("rejected"); return
    }
    span.setAttribute("oracle.tts.chars", text.length)
    const voice = typeof tellerId === "string" ? tellers.get(tellerId)?.call?.voice : undefined
    if (!voice) { response.status(404).json({ error: "teller cannot be called" }); done("rejected"); return }
    if (!client) { response.status(503).json({ error: "voice offline" }); done("offline"); return }
    try {
      const audio = await client.synthesize(text, voice)
      response.status(200).type("audio/wav").send(Buffer.from(audio))
      done("ok")
    } catch (error) {
      if (!(error instanceof SpeechUnavailableError)) span.recordException(error as Error)
      response.status(503).json({ error: "voice offline" })
      done("offline")
    }
  }))

  /** Owner speech to text (ADR-0016): local only, and spans never hold the audio or the words. */
  app.post("/api/stt", express.raw({ type: "audio/wav", limit: "2mb" }), (request, response) => tracer.startActiveSpan("oracle.stt", async (span) => {
    const done = (outcome: "ok" | "offline" | "rejected") => {
      span.setAttribute("oracle.stt.outcome", outcome)
      if (outcome === "offline") span.setStatus({ code: SpanStatusCode.ERROR, message: "speech recognition offline" })
      span.end()
    }
    const body: unknown = request.body
    const durationMs = body instanceof Uint8Array ? wavDurationMs(body) : null
    if (!(body instanceof Uint8Array) || durationMs === null || durationMs > MAX_AUDIO_MS) {
      response.status(400).json({ error: "audio must be a WAV file of up to 30 seconds" }); done("rejected"); return
    }
    span.setAttribute("oracle.stt.audio_ms", Math.round(durationMs))
    if (!client) { response.status(503).json({ error: "speech recognition offline" }); done("offline"); return }
    try {
      const text = await client.transcribe(body)
      span.setAttribute("oracle.stt.chars", text.length)
      response.json({ text })
      done("ok")
    } catch (error) {
      if (!(error instanceof SpeechUnavailableError)) span.recordException(error as Error)
      response.status(503).json({ error: "speech recognition offline" })
      done("offline")
    }
  }))

  app.get("/api/tts/health", async (_request, response) => {
    const [available, stt] = client ? await Promise.all([client.health(), client.transcribeReady()]) : [false, false]
    response.json({ available, stt })
  })
}
