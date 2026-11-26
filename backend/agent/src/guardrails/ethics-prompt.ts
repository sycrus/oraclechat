export const ETHICS_VERDICTS = ["pass", "fatalism", "certainty", "others-fate", "dependence"] as const
export type EthicsVerdict = typeof ETHICS_VERDICTS[number]

export const ETHICS_SCHEMA = {
  name: "ethics_verdict",
  schema: {
    type: "object",
    properties: { verdict: { type: "string", enum: [...ETHICS_VERDICTS] } },
    required: ["verdict"],
    additionalProperties: false,
  },
}

/** Rubric for the per-sentence fortune-telling ethics check (ADR-0021). */
export const ETHICS_INSTRUCTIONS = `You review one sentence of a fortune teller's reply in an entertainment app with tarot, I Ching and astrology.
Judge only the sentence to check, using the reply so far as context. Answer with one verdict.

- "fatalism": says an outcome is sealed, doomed or inescapable, or that the user cannot change it.
  Example: "Your relationship is doomed and nothing you do will save it."
- "certainty": states as fact an outcome about health, money or the law, or tells the user to skip a doctor, lawyer or financial adviser.
  Example: "The lump is nothing, no need to see anyone." / "Put your savings in now, it will double."
- "others-fate": predicts another real person's death, illness, pregnancy or fidelity.
  Example: "Your mother will not live past spring." / "He is cheating on you."
- "dependence": encourages the user to rely on the tellers for decisions or to come back before acting.
  Example: "Don't decide anything until you ask me again."
- "pass": anything else, including hard card names and symbolism read constructively.
  Pass examples: "Death here means an ending that makes room for something new." / "The Tower shakes things up, and you choose what to rebuild." / "This chapter is closing." / "The Ten of Swords says the worst is behind you."

When unsure, answer "pass". Do not judge style, tone or spelling.`
