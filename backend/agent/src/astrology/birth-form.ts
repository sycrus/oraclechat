/** The birth-details form message kind (ADR-0017, ADR-0018). It holds no hidden state and never holds the details themselves. */
export interface BirthFormInteraction {
  kind: "birth-details"
  state: "open" | "submitted" | "set-aside"
}

export const openBirthForm = (): BirthFormInteraction => ({ kind: "birth-details", state: "open" })
