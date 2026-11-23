import { describe, it, expect, vi } from "vitest"
import { createSpeechClient, SpeechUnavailableError } from "../../src/speech/client.js"

const wav = Buffer.from("RIFF....WAVEfmt ")

function fakeFetch(respond: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => respond(String(input), init))
}

describe("speech client", () => {
  it("posts text and voice to /synthesize and returns the WAV bytes", async () => {
    const fetch = fakeFetch(() => new Response(wav, { status: 200, headers: { "Content-Type": "audio/wav" } }))
    const client = createSpeechClient({ baseUrl: "http://127.0.0.1:4100/", fetch })

    const audio = await client.synthesize("Hello, I'm Mira", "mira")

    expect(Buffer.from(audio).equals(wav)).toBe(true)
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe("http://127.0.0.1:4100/synthesize")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ text: "Hello, I'm Mira", voice: "mira" })
  })

  it("treats a refused connection as unavailable", async () => {
    const fetch = fakeFetch(() => { throw new TypeError("fetch failed") })
    const client = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch })
    await expect(client.synthesize("Hi", "mira")).rejects.toBeInstanceOf(SpeechUnavailableError)
  })

  it.each([500, 503, 404])("treats HTTP %i as unavailable", async (status) => {
    const fetch = fakeFetch(() => new Response("nope", { status }))
    const client = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch })
    await expect(client.synthesize("Hi", "mira")).rejects.toBeInstanceOf(SpeechUnavailableError)
  })

  it("times out a request that takes too long", async () => {
    const fetch = fakeFetch((_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
    }))
    const client = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch, timeoutMs: 10 })
    await expect(client.synthesize("Hi", "mira")).rejects.toBeInstanceOf(SpeechUnavailableError)
  })

  it("reports health from /health", async () => {
    const up = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => Response.json({ ready: true })) })
    const loading = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => Response.json({ ready: false })) })
    const down = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => { throw new TypeError("fetch failed") }) })
    expect(await up.health()).toBe(true)
    expect(await loading.health()).toBe(false)
    expect(await down.health()).toBe(false)
  })

  it("posts WAV bytes to /transcribe and returns the text", async () => {
    const fetch = fakeFetch(() => Response.json({ text: "Should I start the novel?" }))
    const client = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch })

    expect(await client.transcribe(new Uint8Array(wav))).toBe("Should I start the novel?")
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe("http://127.0.0.1:4100/transcribe")
    expect(init?.method).toBe("POST")
    expect(new Headers(init?.headers).get("Content-Type")).toBe("audio/wav")
    expect(Buffer.from(init?.body as Uint8Array).equals(wav)).toBe(true)
  })

  it.each([503, 400])("treats a failed transcription (HTTP %i) as unavailable", async (status) => {
    const client = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => new Response("nope", { status })) })
    await expect(client.transcribe(new Uint8Array(wav))).rejects.toBeInstanceOf(SpeechUnavailableError)
  })

  it("treats a malformed transcription response as unavailable", async () => {
    const client = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => Response.json({ words: [] })) })
    await expect(client.transcribe(new Uint8Array(wav))).rejects.toBeInstanceOf(SpeechUnavailableError)
  })

  it("reports whether transcription is ready from /health", async () => {
    const ready = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => Response.json({ ready: true, transcribe: true })) })
    const voiceOnly = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => Response.json({ ready: true, transcribe: false })) })
    const down = createSpeechClient({ baseUrl: "http://127.0.0.1:4100", fetch: fakeFetch(() => { throw new TypeError("fetch failed") }) })
    expect(await ready.transcribeReady()).toBe(true)
    expect(await voiceOnly.transcribeReady()).toBe(false)
    expect(await down.transcribeReady()).toBe(false)
  })
})
