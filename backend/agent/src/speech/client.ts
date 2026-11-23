/** Client for the local speech sidecar (services/tts). Every failure means "voice offline" (ADR-0015). */

export class SpeechUnavailableError extends Error {
  constructor(reason: string) {
    super(`Speech service unavailable: ${reason}`)
    this.name = "SpeechUnavailableError"
  }
}

export interface SpeechClient {
  synthesize(text: string, voice: string): Promise<Uint8Array>
  health(): Promise<boolean>
  /** Owner speech to text (ADR-0016). The audio is passed through, never kept. */
  transcribe(wav: Uint8Array): Promise<string>
  transcribeReady(): Promise<boolean>
}

export interface SpeechClientOptions {
  baseUrl: string
  fetch?: typeof fetch
  timeoutMs?: number
}

export function createSpeechClient({ baseUrl, fetch: fetchImpl = fetch, timeoutMs = 30_000 }: SpeechClientOptions): SpeechClient {
  const base = baseUrl.replace(/\/+$/, "")

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response
    try {
      response = await fetchImpl(`${base}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      throw new SpeechUnavailableError(error instanceof Error ? error.name : "request failed")
    }
    if (!response.ok) throw new SpeechUnavailableError(`HTTP ${response.status}`)
    return response
  }

  async function readHealth(): Promise<{ ready?: unknown; transcribe?: unknown }> {
    try {
      return await (await request("/health")).json() as { ready?: unknown; transcribe?: unknown }
    } catch {
      return {}
    }
  }

  return {
    async synthesize(text, voice) {
      const response = await request("/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      })
      return new Uint8Array(await response.arrayBuffer())
    },
    async health() {
      return (await readHealth()).ready === true
    },
    async transcribe(wav) {
      const response = await request("/transcribe", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav })
      const body = await response.json().catch(() => ({})) as { text?: unknown }
      if (typeof body.text !== "string") throw new SpeechUnavailableError("malformed transcription")
      return body.text
    },
    async transcribeReady() {
      return (await readHealth()).transcribe === true
    },
  }
}
