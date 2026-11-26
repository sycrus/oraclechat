import { describe, expect, it } from "vitest"
import { checkEthics } from "../../src/guardrails/openai.js"
import { GuardrailError } from "../../src/guardrails/types.js"
import type { AgentRequest, LocalModelConfig } from "../../src/agent/runtime.js"

const config = { baseURL: "https://api.openai.com/v1", apiKey: "sk-guard", model: "gpt-small" }

function runner(output: string | (() => Promise<string>)) {
  const calls: Array<{ request: AgentRequest; config: LocalModelConfig | undefined }> = []
  const run = async (request: AgentRequest, runConfig?: LocalModelConfig) => {
    calls.push({ request, config: runConfig })
    return typeof output === "string" ? output : output()
  }
  return { run, calls }
}

describe("fortune-telling ethics check", () => {
  it("sends only the sentence and the reply so far, at temperature 0 with a fixed verdict schema, to the guardrail model", async () => {
    const { run, calls } = runner(JSON.stringify({ verdict: "pass" }))
    await checkEthics("Take one step this week.", "The cards lean your way.", config, run)

    expect(calls).toHaveLength(1)
    const { request, config: used } = calls[0]!
    expect(used).toEqual({ baseURL: config.baseURL, apiKey: "sk-guard", model: "gpt-small", system: "openai-guardrails" })
    expect(request.temperature).toBe(0)
    expect(request.thinking).toBe(false)
    expect(request.outputSchema?.name).toBe("ethics_verdict")
    expect(request.input).toBe("Reply so far:\nThe cards lean your way.\n\nSentence to check:\nTake one step this week.")
  })

  it("maps each verdict to pass or fail", async () => {
    expect(await checkEthics("s", "", config, runner(JSON.stringify({ verdict: "pass" })).run)).toEqual({ outcome: "pass" })
    for (const verdict of ["fatalism", "certainty", "others-fate", "dependence"]) {
      expect(await checkEthics("s", "", config, runner(JSON.stringify({ verdict })).run)).toEqual({ outcome: "fail", check: "ethics", category: verdict })
    }
  })

  it("fails closed on invalid output, a model error or a timeout", async () => {
    await expect(checkEthics("s", "", config, runner("not json").run)).rejects.toBeInstanceOf(GuardrailError)
    await expect(checkEthics("s", "", config, runner(JSON.stringify({ verdict: "maybe" })).run)).rejects.toBeInstanceOf(GuardrailError)
    await expect(checkEthics("s", "", config, runner(async () => { throw new Error("429") }).run)).rejects.toBeInstanceOf(GuardrailError)
    await expect(checkEthics("s", "", config, runner(() => new Promise<string>(() => undefined)).run, 20)).rejects.toBeInstanceOf(GuardrailError)
  })
})
