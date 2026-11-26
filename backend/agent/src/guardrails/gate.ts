import type { SpokenSentence } from "../chat/spoken.js"
import type { SentenceVerdict } from "./types.js"

export interface SentenceGateOptions {
  /** Checks one sentence; `replySoFar` is the reply text before it. */
  check: (sentence: string, replySoFar: string) => Promise<SentenceVerdict>
  /** Called for each passing sentence, strictly in order. */
  release: (sentence: SpokenSentence) => void
  /** Stops the model stream after the first failure or check error. */
  abort: () => void
}

/**
 * Holds each reply sentence until it passes its check (ADR-0021). Checks run concurrently as sentences
 * arrive; release is strictly in order. The first failure or error aborts the stream and drops all later text.
 */
export class SentenceGate {
  private chain: Promise<void> = Promise.resolve()
  private readonly texts: string[] = []
  private readonly released: SpokenSentence[] = []
  private stopped = false
  private outcome: "pass" | "cut" = "pass"

  constructor(private readonly options: SentenceGateOptions) {}

  push(sentence: SpokenSentence): void {
    if (this.stopped) return
    const verdict = this.options.check(sentence.text, this.texts.join(" "))
    this.texts.push(sentence.text)
    verdict.catch(() => undefined)
    this.chain = this.chain.then(async () => {
      if (this.stopped) return
      let result: SentenceVerdict
      try {
        result = await verdict
      } catch (error) {
        this.stop()
        throw error
      }
      if (this.stopped) return
      if (result.outcome === "pass") {
        this.released.push(sentence)
        this.options.release(sentence)
      } else {
        this.outcome = "cut"
        this.stop()
      }
    })
    // finish() surfaces a check error; this only keeps it from counting as unhandled meanwhile.
    this.chain.catch(() => undefined)
  }

  /** Resolves once every pushed sentence is settled; rejects with the first check error. */
  async finish(): Promise<{ released: SpokenSentence[]; outcome: "pass" | "cut" }> {
    await this.chain
    return { released: [...this.released], outcome: this.outcome }
  }

  private stop(): void {
    this.stopped = true
    this.options.abort()
  }
}
