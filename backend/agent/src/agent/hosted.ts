import { streamLocalAgent, type AgentRequest, type AgentTextChunkHandler, type LocalModelConfig } from "./runtime.js"

const VARIABLES = ["HOSTED_BASE_URL", "HOSTED_API_KEY", "HOSTED_MODEL"] as const

/**
 * Optional hosted provider for teller replies (ADR-0014): off unless all three variables are set.
 * A partial configuration is an error, so a typo never silently leaves replies local or half-configured.
 */
export function loadHostedModelConfig(env: NodeJS.ProcessEnv = process.env): LocalModelConfig | undefined {
  const values = VARIABLES.map((name) => env[name]?.trim() ?? "")
  const openaiTraces = ["1", "true"].includes(env["OPENAI_TRACES"]?.trim().toLowerCase() ?? "")
  if (values.every((value) => !value)) {
    if (openaiTraces) throw new Error("OPENAI_TRACES needs hosted replies (HOSTED_BASE_URL, HOSTED_API_KEY and HOSTED_MODEL)")
    return undefined
  }
  const missing = VARIABLES.filter((_name, index) => !values[index])
  if (missing.length > 0) throw new Error(`Hosted replies need all of HOSTED_BASE_URL, HOSTED_API_KEY and HOSTED_MODEL; missing: ${missing.join(", ")}`)
  const [baseURL, apiKey, model] = values as [string, string, string]
  // OpenAI traces only go to the provider that already received the reply (ADR-0022).
  if (openaiTraces && hostOf(baseURL) !== "api.openai.com") throw new Error("OPENAI_TRACES needs HOSTED_BASE_URL on api.openai.com")
  return { baseURL, apiKey, model, system: "hosted", ...(openaiTraces ? { openaiTraces } : {}) }
}

function hostOf(url: string): string | undefined {
  try { return new URL(url).hostname } catch { return undefined }
}

/** Teller-reply stream for a hosted provider. Providers handle reasoning differently, so the local thinking switch is dropped. No local fallback. */
export function createHostedStream(
  config: LocalModelConfig,
  stream: (request: AgentRequest, onChunk: AgentTextChunkHandler, config: LocalModelConfig) => Promise<string> = streamLocalAgent,
): (request: AgentRequest, onChunk: AgentTextChunkHandler) => Promise<string> {
  return (request, onChunk) => {
    const { thinking: _thinking, ...hostedRequest } = request
    return stream(hostedRequest, onChunk, config)
  }
}
