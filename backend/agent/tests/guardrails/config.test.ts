import { describe, expect, it } from "vitest"
import { loadGuardrailsConfig } from "../../src/guardrails/config.js"

const env = { OPENAI_GUARDRAILS_API_KEY: "sk-guard", OPENAI_GUARDRAILS_MODEL: "gpt-small" }

describe("guardrails launch configuration", () => {
  it("stays off without the --guardrails=openai flag, even with both variables set", () => {
    expect(loadGuardrailsConfig([], env)).toBeUndefined()
    expect(loadGuardrailsConfig(["node", "dist/server.js"], env)).toBeUndefined()
  })

  it("refuses to start with the flag but no key or model, naming what is missing without the key", () => {
    expect(() => loadGuardrailsConfig(["--guardrails=openai"], {})).toThrow("OPENAI_GUARDRAILS_API_KEY, OPENAI_GUARDRAILS_MODEL")
    try {
      loadGuardrailsConfig(["--guardrails=openai"], { OPENAI_GUARDRAILS_API_KEY: "sk-guard", OPENAI_GUARDRAILS_MODEL: " " })
      expect.unreachable()
    } catch (error) {
      expect(String(error)).toContain("OPENAI_GUARDRAILS_MODEL")
      expect(String(error)).not.toContain("sk-guard")
    }
  })

  it("turns on with the flag and both variables, always pointing at OpenAI", () => {
    expect(loadGuardrailsConfig(["node", "dist/server.js", "--guardrails=openai"], { ...env, HOSTED_BASE_URL: "https://other.example/v1", OPENAI_GUARDRAILS_MODEL: " gpt-small " }))
      .toEqual({ baseURL: "https://api.openai.com/v1", apiKey: "sk-guard", model: "gpt-small" })
  })
})
