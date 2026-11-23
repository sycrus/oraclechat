import { context, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../src/server/app.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import { SpeechUnavailableError, type SpeechClient } from "../../src/speech/client.js"
import { NO_CALL_TELLER } from "../tellers/no-call-teller.js"

const wav = new Uint8Array(Buffer.from("RIFF0000WAVEfmt "))
const exporter = new InMemorySpanExporter()
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })

let registry: TellerRegistry
const servers: Server[] = []

async function serve(speech: { client?: SpeechClient }): Promise<string> {
  const server = createApp(undefined, { speech: { ...speech, tellers: registry } }).listen(0, "127.0.0.1")
  servers.push(server)
  await new Promise<void>((resolve) => server.once("listening", resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

/** A 16-bit mono PCM WAV of silence. */
function makeWav(seconds: number, rate = 16000): Uint8Array {
  const data = Math.round(seconds * rate) * 2
  const buffer = Buffer.alloc(44 + data)
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + data, 4); buffer.write("WAVE", 8)
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36); buffer.writeUInt32LE(data, 40)
  return new Uint8Array(buffer)
}

function fakeClient(behaviour: "ok" | "down" | "no-stt" = "ok", transcript = "A private question about my novel") {
  const calls: Array<{ text: string; voice: string }> = []
  const heard: number[] = []
  const client: SpeechClient = {
    async synthesize(text, voice) {
      calls.push({ text, voice })
      if (behaviour === "down") throw new SpeechUnavailableError("fetch failed")
      return wav
    },
    async health() { return behaviour !== "down" },
    async transcribe(audio) {
      heard.push(audio.length)
      if (behaviour !== "ok") throw new SpeechUnavailableError("HTTP 503")
      return transcript
    },
    async transcribeReady() { return behaviour === "ok" },
  }
  return { client, calls, heard }
}

const say = (base: string, body: unknown) =>
  fetch(`${base}/api/tts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

beforeAll(async () => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable())
  trace.setGlobalTracerProvider(provider)
  registry = new TellerRegistry()
  await registry.loadFromDirectory("src/tellers/definitions")
  registry.register(NO_CALL_TELLER)
})

beforeEach(() => exporter.reset())

afterAll(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))))
  await provider.shutdown()
})

describe("POST /api/tts", () => {
  it("returns WAV audio in the teller's voice", async () => {
    const { client, calls } = fakeClient()
    const response = await say(await serve({ client }), { tellerId: "mira-the-mystic", text: "Hello, I'm Mira" })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("audio/wav")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(wav)
    expect(calls).toEqual([{ text: "Hello, I'm Mira", voice: "mira" }])
  })

  it.each([
    ["empty", ""],
    ["blank", "   "],
    ["over 500 characters", "a".repeat(501)],
    ["not a string", 42],
  ])("rejects %s text without synthesizing", async (_label, text) => {
    const { client, calls } = fakeClient()
    const response = await say(await serve({ client }), { tellerId: "mira-the-mystic", text })
    expect(response.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it.each([["an unknown teller", "nobody"], ["a teller without calls", "quiet-quill"]])("rejects %s", async (_label, tellerId) => {
    const { client, calls } = fakeClient()
    const response = await say(await serve({ client }), { tellerId, text: "Hi" })
    expect(response.status).toBe(404)
    expect(calls).toHaveLength(0)
  })

  it("returns WAV audio in Sage's voice", async () => {
    const { client, calls } = fakeClient()
    const response = await say(await serve({ client }), { tellerId: "sage-the-seer", text: "Hello, I'm Sage" })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("audio/wav")
    expect(calls).toEqual([{ text: "Hello, I'm Sage", voice: "sage" }])
  })

  it("reports voice offline when no speech service is configured", async () => {
    const response = await say(await serve({}), { tellerId: "mira-the-mystic", text: "Hi" })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "voice offline" })
  })

  it("reports voice offline when the speech service fails, without trying anything else", async () => {
    const { client, calls } = fakeClient("down")
    const response = await say(await serve({ client }), { tellerId: "mira-the-mystic", text: "Hi" })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "voice offline" })
    expect(calls).toHaveLength(1)
  })

  it("traces the request with metadata only", async () => {
    const { client } = fakeClient()
    await say(await serve({ client }), { tellerId: "mira-the-mystic", text: "A private sentence" })
    await provider.forceFlush()

    const span = exporter.getFinishedSpans().find((item) => item.name === "oracle.tts")
    expect(span).toBeDefined()
    expect(span!.attributes).toMatchObject({ "oracle.teller.id": "mira-the-mystic", "oracle.tts.chars": 18, "oracle.tts.outcome": "ok" })
    expect(JSON.stringify(span!.attributes)).not.toContain("private")
  })

  it("traces an offline outcome", async () => {
    await say(await serve({}), { tellerId: "mira-the-mystic", text: "Hi" })
    await provider.forceFlush()
    expect(exporter.getFinishedSpans().find((item) => item.name === "oracle.tts")?.attributes["oracle.tts.outcome"]).toBe("offline")
  })
})

describe("GET /api/tts/health", () => {
  it("reports whether the speech service is available", async () => {
    const up = await fetch(`${await serve({ client: fakeClient().client })}/api/tts/health`)
    const down = await fetch(`${await serve({ client: fakeClient("down").client })}/api/tts/health`)
    const none = await fetch(`${await serve({})}/api/tts/health`)
    const voiceOnly = await fetch(`${await serve({ client: fakeClient("no-stt").client })}/api/tts/health`)
    expect(await up.json()).toEqual({ available: true, stt: true })
    expect(await down.json()).toEqual({ available: false, stt: false })
    expect(await none.json()).toEqual({ available: false, stt: false })
    expect(await voiceOnly.json()).toEqual({ available: true, stt: false })
  })
})

const hear = (base: string, body: Uint8Array | string, type = "audio/wav") =>
  fetch(`${base}/api/stt`, { method: "POST", headers: { "Content-Type": type }, body })

describe("POST /api/stt", () => {
  it("returns the local transcript of a WAV turn", async () => {
    const { client, heard } = fakeClient()
    const audio = makeWav(1.5)
    const response = await hear(await serve({ client }), audio)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ text: "A private question about my novel" })
    expect(heard).toEqual([audio.length])
  })

  it.each([
    ["empty audio", new Uint8Array(0), "audio/wav"],
    ["a non-WAV body", new Uint8Array(Buffer.from("this is not audio at all, just text")), "audio/wav"],
    ["a WAV header with no samples", makeWav(0), "audio/wav"],
    ["audio over 30 seconds", makeWav(31, 8000), "audio/wav"],
    ["the wrong content type", makeWav(1), "application/octet-stream"],
  ])("rejects %s without calling the speech service", async (_label, body, type) => {
    const { client, heard } = fakeClient()
    const response = await hear(await serve({ client }), body, type)
    expect(response.status).toBe(400)
    expect(heard).toHaveLength(0)
  })

  it("is offline when no speech service is configured", async () => {
    const response = await hear(await serve({}), makeWav(1))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "speech recognition offline" })
  })

  it("is offline when transcription fails", async () => {
    const response = await hear(await serve({ client: fakeClient("no-stt").client }), makeWav(1))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "speech recognition offline" })
  })

  it("traces duration and length only, never the words", async () => {
    await hear(await serve({ client: fakeClient().client }), makeWav(1.5))
    await provider.forceFlush()

    const span = exporter.getFinishedSpans().find((item) => item.name === "oracle.stt")
    expect(span?.attributes).toMatchObject({ "oracle.stt.outcome": "ok", "oracle.stt.audio_ms": 1500, "oracle.stt.chars": 33 })
    expect(JSON.stringify(span!.attributes)).not.toContain("private")
  })

  it("traces rejected and offline outcomes", async () => {
    await hear(await serve({ client: fakeClient().client }), new Uint8Array(0))
    await hear(await serve({}), makeWav(1))
    await provider.forceFlush()
    const outcomes = exporter.getFinishedSpans().filter((item) => item.name === "oracle.stt").map((item) => item.attributes["oracle.stt.outcome"])
    expect(outcomes).toEqual(["rejected", "offline"])
  })
})
