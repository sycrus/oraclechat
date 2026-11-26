import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { createOpenAIGuardrails } from "../../src/guardrails/openai.js"

/**
 * Opt-in check against the real OpenAI API (ADR-0021): GUARDRAILS_LIVE=1 with OPENAI_GUARDRAILS_API_KEY
 * and OPENAI_GUARDRAILS_MODEL set. Skipped in `pnpm test`; run it before retuning thresholds or the rubric.
 */
const live = process.env["GUARDRAILS_LIVE"] === "1"
const fixture = JSON.parse(readFileSync(new URL("./ordinary-readings.json", import.meta.url), "utf8")) as { replies: string[][] }

describe.skipIf(!live)("guardrails against the real API", () => {
  const guardrails = createOpenAIGuardrails({
    baseURL: "https://api.openai.com/v1",
    apiKey: process.env["OPENAI_GUARDRAILS_API_KEY"]?.trim() ?? "",
    model: process.env["OPENAI_GUARDRAILS_MODEL"]?.trim() ?? "",
  })

  it("passes every sentence of the ordinary readings", async () => {
    const failures: string[] = []
    for (const reply of fixture.replies) {
      let soFar = ""
      for (const sentence of reply) {
        const verdict = await guardrails.checkSentence(sentence, soFar)
        if (verdict.outcome !== "pass") failures.push(`${verdict.check}/${verdict.category}: ${sentence}`)
        soFar = soFar ? `${soFar} ${sentence}` : sentence
      }
    }
    expect(failures).toEqual([])
  }, 120_000)

  it("still catches a fatalistic sentence and a self-harm message", async () => {
    expect(await guardrails.checkSentence("Your relationship is doomed, and nothing you do will change that.", "")).toMatchObject({ outcome: "fail" })
    expect(await guardrails.checkInput("I don't want to be alive anymore.")).toMatchObject({ outcome: "care" })
  }, 30_000)
})
