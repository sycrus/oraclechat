/** A check that errored or timed out. Guarded mode fails closed on it (ADR-0021). */
export class GuardrailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GuardrailError"
  }
}

export interface InputVerdict {
  outcome: "pass" | "care" | "refuse"
  /** The flagged category, for traces only. */
  category?: string
}

export interface SentenceVerdict {
  outcome: "pass" | "fail"
  check?: "moderation" | "ethics"
  category?: string
}

/** The checks a guarded turn runs. Each receives only the text it judges (ADR-0021). */
export interface Guardrails {
  checkInput(text: string): Promise<InputVerdict>
  /** `replySoFar` is the reply text already released before this sentence. */
  checkSentence(sentence: string, replySoFar: string): Promise<SentenceVerdict>
}
