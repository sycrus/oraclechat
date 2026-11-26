import { runLocalAgent, type AgentRequest, type LocalModelConfig } from "../agent/runtime.js"
import type { GuardrailsConfig } from "./config.js"
import { ETHICS_INSTRUCTIONS, ETHICS_SCHEMA, ETHICS_VERDICTS, type EthicsVerdict } from "./ethics-prompt.js"
import { inputVerdict, outputVerdict, type Scores } from "./thresholds.js"
import { GuardrailError, type Guardrails, type SentenceVerdict } from "./types.js"

export const CHECK_TIMEOUT_MS = 5_000

type Fetch = (url: string | URL | Request, init?: RequestInit) => Promise<Response>

/** OpenAI moderation category scores for `text` alone. Any failure or timeout throws `GuardrailError`. */
export async function moderate(text: string, config: GuardrailsConfig, fetchImpl: Fetch = fetch, timeoutMs = CHECK_TIMEOUT_MS): Promise<Scores> {
  let response: Response
  try {
    response = await fetchImpl(`${config.baseURL}/moderations`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new GuardrailError("Moderation request failed or timed out")
  }
  if (!response.ok) throw new GuardrailError(`Moderation returned ${response.status}`)
  const body = await response.json().catch(() => undefined) as { results?: Array<{ category_scores?: Scores }> } | undefined
  const scores = body?.results?.[0]?.category_scores
  if (!scores || typeof scores !== "object") throw new GuardrailError("Moderation returned no scores")
  return scores
}

type Run = (request: AgentRequest, config?: LocalModelConfig) => Promise<string>

/**
 * The fortune-telling ethics check on one reply sentence, through the Agents SDK runtime (ADR-0003).
 * It sees only the sentence and the reply text released before it. Any failure or timeout throws `GuardrailError`.
 */
export async function checkEthics(sentence: string, replySoFar: string, config: GuardrailsConfig, run: Run = runLocalAgent, timeoutMs = CHECK_TIMEOUT_MS): Promise<SentenceVerdict> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new GuardrailError("Ethics check timed out")), timeoutMs) })
  let output: string
  try {
    output = await Promise.race([
      run({
        name: "Ethics guardrail",
        instructions: ETHICS_INSTRUCTIONS,
        input: `Reply so far:\n${replySoFar}\n\nSentence to check:\n${sentence}`,
        temperature: 0,
        // No hidden reasoning (reasoning_effort "none"): a one-word verdict doesn't need it, and it adds cost and delay.
        thinking: false,
        outputSchema: ETHICS_SCHEMA,
      }, { baseURL: config.baseURL, apiKey: config.apiKey, model: config.model, system: "openai-guardrails" }),
      timeout,
    ])
  } catch (error) {
    throw error instanceof GuardrailError ? error : new GuardrailError("Ethics check failed")
  } finally {
    clearTimeout(timer)
  }
  let verdict: unknown
  try { verdict = (JSON.parse(output) as { verdict?: unknown }).verdict } catch { /* handled below */ }
  if (!ETHICS_VERDICTS.includes(verdict as EthicsVerdict)) throw new GuardrailError("Ethics check returned no valid verdict")
  return verdict === "pass" ? { outcome: "pass" } : { outcome: "fail", check: "ethics", category: verdict as string }
}

/** Guarded mode's checks (ADR-0021): moderation on user messages; moderation and the ethics check, concurrently, on each reply sentence. */
export function createOpenAIGuardrails(config: GuardrailsConfig, deps: { fetch?: Fetch; run?: Run } = {}): Guardrails {
  return {
    checkInput: async (text) => inputVerdict(await moderate(text, config, deps.fetch)),
    checkSentence: async (sentence, replySoFar) => {
      const [scores, ethics] = await Promise.all([moderate(sentence, config, deps.fetch), checkEthics(sentence, replySoFar, config, deps.run)])
      const moderation = outputVerdict(scores)
      return moderation.outcome === "fail" ? moderation : ethics
    },
  }
}
