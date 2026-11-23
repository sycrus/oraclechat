import { streamLocalAgent, type AgentRequest, type AgentTextChunkHandler, type LocalModelConfig } from "./runtime.js"

const VARIABLES = ["HOSTED_BASE_URL", "HOSTED_API_KEY", "HOSTED_MODEL"] as const

/**
 * Optional hosted provider for teller replies (ADR-0014): off unless all three variables are set.
 * A partial configuration is an error, so a typo never silently leaves replies local or half-configured.
 */
export function loadHostedModelConfig(env: NodeJS.ProcessEnv = process.env): LocalModelConfig | undefined {
  const values = VARIABLES.map((name) => env[name]?.trim() ?? "")
  if (values.every((value) => !value)) return undefined
  const missing = VARIABLES.filter((_name, index) => !values[index])
  if (missing.length > 0) throw new Error(`Hosted replies need all of HOSTED_BASE_URL, HOSTED_API_KEY and HOSTED_MODEL; missing: ${missing.join(", ")}`)
  const [baseURL, apiKey, model] = values as [string, string, string]
  return { baseURL, apiKey, model, system: "hosted" }
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
