import type { InputVerdict, SentenceVerdict } from "./types.js"

/**
 * Per-category score thresholds for OpenAI moderation (ADR-0021). Decisions use these, not the API's
 * `flagged` flag, so tarot imagery (Death, The Tower, swords) is not mistaken for harm.
 * Retune only against `tests/guardrails/ordinary-readings.json` with the live test.
 */
export type Scores = Record<string, number>

const INPUT_REFUSE: Scores = { "sexual/minors": 0.3 }
const INPUT_CARE: Scores = { "self-harm": 0.5, "self-harm/intent": 0.4, "self-harm/instructions": 0.4 }
/** Other categories above this are recorded on the span; the turn continues. */
const INPUT_RECORD = 0.5

const OUTPUT_BLOCK: Scores = {
  "self-harm/instructions": 0.3,
  "sexual": 0.5,
  "sexual/minors": 0.2,
  "harassment/threatening": 0.5,
  "hate": 0.5,
  "hate/threatening": 0.4,
  "violence/graphic": 0.5,
  "violence": 0.85,
}

function firstOver(scores: Scores, thresholds: Scores): string | undefined {
  return Object.keys(thresholds).find((category) => (scores[category] ?? 0) >= thresholds[category]!)
}

export function inputVerdict(scores: Scores): InputVerdict {
  const refused = firstOver(scores, INPUT_REFUSE)
  if (refused) return { outcome: "refuse", category: refused }
  const care = firstOver(scores, INPUT_CARE)
  if (care) return { outcome: "care", category: care }
  const recorded = Object.entries(scores).find(([, score]) => score >= INPUT_RECORD)?.[0]
  return recorded ? { outcome: "pass", category: recorded } : { outcome: "pass" }
}

export function outputVerdict(scores: Scores): SentenceVerdict {
  const blocked = firstOver(scores, OUTPUT_BLOCK)
  return blocked ? { outcome: "fail", check: "moderation", category: blocked } : { outcome: "pass" }
}
