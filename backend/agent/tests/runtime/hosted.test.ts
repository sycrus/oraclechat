import { describe, expect, it } from "vitest"
import { createHostedStream, loadHostedModelConfig } from "../../src/agent/hosted.js"
import type { AgentRequest, LocalModelConfig } from "../../src/agent/runtime.js"

describe("hosted model configuration", () => {
  it("stays off when no hosted variable is set", () => {
    expect(loadHostedModelConfig({})).toBeUndefined()
    expect(loadHostedModelConfig({ HOSTED_BASE_URL: " ", HOSTED_API_KEY: "", HOSTED_MODEL: "" })).toBeUndefined()
  })

  it("turns on when all three are set, trimmed", () => {
    expect(loadHostedModelConfig({ HOSTED_BASE_URL: " https://api.example.com/v1 ", HOSTED_API_KEY: " sk-secret ", HOSTED_MODEL: " big-model " }))
      .toEqual({ baseURL: "https://api.example.com/v1", apiKey: "sk-secret", model: "big-model", system: "hosted" })
  })

  it("refuses a partial configuration, naming what is missing without showing the key", () => {
    expect(() => loadHostedModelConfig({ HOSTED_API_KEY: "sk-secret" })).toThrow("HOSTED_BASE_URL, HOSTED_MODEL")
    try {
      loadHostedModelConfig({ HOSTED_API_KEY: "sk-secret", HOSTED_MODEL: "m" })
    } catch (error) {
      expect(String(error)).toContain("HOSTED_BASE_URL")
      expect(String(error)).not.toContain("sk-secret")
    }
  })
})

describe("OpenAI traces for hosted replies (ADR-0022)", () => {
  const openai = { HOSTED_BASE_URL: "https://api.openai.com/v1", HOSTED_API_KEY: "sk-secret", HOSTED_MODEL: "gpt-x" }

  it("marks the hosted config as traced only for 1 or true", () => {
    for (const value of ["1", "true", " TRUE "]) expect(loadHostedModelConfig({ ...openai, OPENAI_TRACES: value })?.openaiTraces).toBe(true)
    for (const value of [undefined, "", "0", "yes", "false"]) expect(loadHostedModelConfig({ ...openai, OPENAI_TRACES: value })?.openaiTraces).toBeUndefined()
  })

  it("refuses the switch without hosted replies", () => {
    expect(() => loadHostedModelConfig({ OPENAI_TRACES: "1" })).toThrow("OPENAI_TRACES needs hosted replies")
  })

  it("refuses the switch for a provider other than OpenAI, without showing the key", () => {
    expect(() => loadHostedModelConfig({ ...openai, HOSTED_BASE_URL: "https://openrouter.ai/api/v1", OPENAI_TRACES: "1" })).toThrow("api.openai.com")
    expect(() => loadHostedModelConfig({ ...openai, HOSTED_BASE_URL: "https://api.openai.com.evil.example/v1", OPENAI_TRACES: "1" })).toThrow("api.openai.com")
    try { loadHostedModelConfig({ ...openai, HOSTED_BASE_URL: "https://openrouter.ai/api/v1", OPENAI_TRACES: "1" }) } catch (error) {
      expect(String(error)).not.toContain("sk-secret")
    }
  })
})

describe("hosted teller stream", () => {
  it("sends every teller reply to the hosted config without the local thinking setting", async () => {
    const calls: Array<{ request: AgentRequest; config: LocalModelConfig | undefined }> = []
    const hosted = { baseURL: "https://api.example.com/v1", apiKey: "sk-secret", model: "big-model", system: "hosted" }
    const stream = createHostedStream(hosted, async (request, _onChunk, config) => { calls.push({ request, config }); return "reply" })

    expect(await stream({ name: "Mira", instructions: "i", input: "x", thinking: false }, () => undefined)).toBe("reply")
    expect(calls).toEqual([{ request: { name: "Mira", instructions: "i", input: "x" }, config: hosted }])
  })

  it("passes the abort signal through to the hosted run", async () => {
    let seen: AbortSignal | undefined
    const hosted = { baseURL: "https://api.example.com/v1", apiKey: "sk-secret", model: "big-model", system: "hosted" }
    const signal = new AbortController().signal
    await createHostedStream(hosted, async (request) => { seen = request.signal; return "" })({ name: "Mira", instructions: "i", input: "x", signal }, () => undefined)
    expect(seen).toBe(signal)
  })
})

