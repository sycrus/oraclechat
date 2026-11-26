import { describe, expect, it } from "vitest"
import { createOpenAIGuardrails, moderate } from "../../src/guardrails/openai.js"
import { inputVerdict, outputVerdict } from "../../src/guardrails/thresholds.js"
import { GuardrailError } from "../../src/guardrails/types.js"

const config = { baseURL: "https://api.openai.com/v1", apiKey: "sk-guard", model: "gpt-small" }

function scoresResponse(scores: Record<string, number>, status = 200): Response {
  return new Response(JSON.stringify({ results: [{ flagged: false, category_scores: scores }] }), { status })
}

describe("OpenAI moderation call", () => {
  it("sends only the given text to the moderations endpoint and returns category scores", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const scores = await moderate("Will my new job work out?", config, async (url, init) => {
      calls.push({ url: String(url), init: init! })
      return scoresResponse({ violence: 0.01 })
    })

    expect(scores).toEqual({ violence: 0.01 })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe("https://api.openai.com/v1/moderations")
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ model: "omni-moderation-latest", input: "Will my new job work out?" })
    expect((calls[0]!.init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-guard")
  })

  it("fails closed with a GuardrailError on a non-200 answer, without showing the key", async () => {
    const failing = moderate("hi", config, async () => scoresResponse({}, 503))
    await expect(failing).rejects.toBeInstanceOf(GuardrailError)
    await expect(failing).rejects.not.toThrow("sk-guard")
  })

  it("fails closed on a network error or timeout", async () => {
    await expect(moderate("hi", config, async () => { throw new Error("socket hang up") })).rejects.toBeInstanceOf(GuardrailError)
    const hanging = (_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
    })
    await expect(moderate("hi", config, hanging, 20)).rejects.toBeInstanceOf(GuardrailError)
  })

  it("fails closed on a malformed answer", async () => {
    await expect(moderate("hi", config, async () => new Response(JSON.stringify({ results: [] })))).rejects.toBeInstanceOf(GuardrailError)
  })
})

describe("input thresholds", () => {
  it("passes ordinary questions", () => {
    expect(inputVerdict({ "self-harm": 0.01, violence: 0.02 })).toEqual({ outcome: "pass" })
  })

  it("starts a care turn on any self-harm signal", () => {
    expect(inputVerdict({ "self-harm": 0.7 })).toEqual({ outcome: "care", category: "self-harm" })
    expect(inputVerdict({ "self-harm/intent": 0.6 })).toEqual({ outcome: "care", category: "self-harm/intent" })
  })

  it("refuses sexual content involving minors, ahead of a care signal", () => {
    expect(inputVerdict({ "sexual/minors": 0.6, "self-harm": 0.9 })).toEqual({ outcome: "refuse", category: "sexual/minors" })
  })

  it("records other flagged categories and lets the turn continue", () => {
    expect(inputVerdict({ harassment: 0.9 })).toEqual({ outcome: "pass", category: "harassment" })
  })
})

describe("output thresholds", () => {
  it("passes tarot imagery that scores some violence", () => {
    expect(outputVerdict({ violence: 0.4, "violence/graphic": 0.05 })).toEqual({ outcome: "pass" })
  })

  it("blocks harmful reply sentences, naming the category", () => {
    expect(outputVerdict({ "self-harm/instructions": 0.5 })).toEqual({ outcome: "fail", check: "moderation", category: "self-harm/instructions" })
    expect(outputVerdict({ "harassment/threatening": 0.8 })).toEqual({ outcome: "fail", check: "moderation", category: "harassment/threatening" })
    expect(outputVerdict({ violence: 0.95 })).toEqual({ outcome: "fail", check: "moderation", category: "violence" })
    expect(outputVerdict({ "sexual/minors": 0.3 })).toEqual({ outcome: "fail", check: "moderation", category: "sexual/minors" })
  })
})

describe("OpenAI guardrails", () => {
  const fetchScores = (scores: Record<string, number>) => async () => scoresResponse(scores)
  const ethics = (verdict: string) => async () => JSON.stringify({ verdict })

  it("checks a user message with moderation only", async () => {
    let ethicsCalls = 0
    const guardrails = createOpenAIGuardrails(config, { fetch: fetchScores({ "self-harm": 0.8 }), run: async () => { ethicsCalls += 1; return "" } })
    expect(await guardrails.checkInput("I don't want to be here anymore")).toEqual({ outcome: "care", category: "self-harm" })
    expect(ethicsCalls).toBe(0)
  })

  it("passes a sentence only when moderation and the ethics check both pass", async () => {
    expect(await createOpenAIGuardrails(config, { fetch: fetchScores({}), run: ethics("pass") }).checkSentence("s", "")).toEqual({ outcome: "pass" })
    expect(await createOpenAIGuardrails(config, { fetch: fetchScores({}), run: ethics("fatalism") }).checkSentence("s", ""))
      .toEqual({ outcome: "fail", check: "ethics", category: "fatalism" })
    expect(await createOpenAIGuardrails(config, { fetch: fetchScores({ "violence/graphic": 0.9 }), run: ethics("pass") }).checkSentence("s", ""))
      .toEqual({ outcome: "fail", check: "moderation", category: "violence/graphic" })
  })

  it("fails closed when either sentence check errors", async () => {
    await expect(createOpenAIGuardrails(config, { fetch: async () => scoresResponse({}, 500), run: ethics("pass") }).checkSentence("s", "")).rejects.toBeInstanceOf(GuardrailError)
    await expect(createOpenAIGuardrails(config, { fetch: fetchScores({}), run: async () => "bad" }).checkSentence("s", "")).rejects.toBeInstanceOf(GuardrailError)
  })
})
