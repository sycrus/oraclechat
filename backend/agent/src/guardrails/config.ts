const FLAG = "--guardrails=openai"
const VARIABLES = ["OPENAI_GUARDRAILS_API_KEY", "OPENAI_GUARDRAILS_MODEL"] as const

export interface GuardrailsConfig {
  baseURL: string
  apiKey: string
  model: string
}

/**
 * Guardrails run only when the backend is launched with `start:guarded` (ADR-0021).
 * Variables in `.env` alone never turn them on; the flag without both variables stops startup.
 */
export function loadGuardrailsConfig(argv: readonly string[] = process.argv, env: NodeJS.ProcessEnv = process.env): GuardrailsConfig | undefined {
  if (!argv.includes(FLAG)) return undefined
  const values = VARIABLES.map((name) => env[name]?.trim() ?? "")
  const missing = VARIABLES.filter((_name, index) => !values[index])
  if (missing.length > 0) throw new Error(`Guarded mode needs OPENAI_GUARDRAILS_API_KEY and OPENAI_GUARDRAILS_MODEL; missing: ${missing.join(", ")}`)
  const [apiKey, model] = values as [string, string]
  return { baseURL: "https://api.openai.com/v1", apiKey, model }
}
