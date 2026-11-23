/** The tarot card fan as the browser sees it (ADR-0017): picks and state only. Card identities arrive only at the reveal, as a normal spread. */

export type FanSpread = "one-card" | "three-card" | "celtic-cross"

export interface CardFan {
  kind: "card-fan"
  state: "open" | "revealed" | "set-aside"
  spread: FanSpread
  size: number
  /** Indexes into the fan, in the order picked. */
  picks: number[]
}

const POSITIONS: Record<FanSpread, number> = { "one-card": 1, "three-card": 3, "celtic-cross": 10 }
/** Cards in the fan beyond what the spread needs. */
const SPARE_CARDS = 6
const STATES = new Set(["open", "revealed", "set-aside"])

/** How many cards the user must pick for this spread. */
export function cardsNeeded(spread: FanSpread): number {
  return POSITIONS[spread]
}

/** Validates fan data from the server; anything else is rejected and the message is shown as plain text. */
export function parseCardFan(value: unknown): CardFan | null {
  if (!value || typeof value !== "object") return null
  const fan = value as Record<string, unknown>
  if (fan.kind !== "card-fan") return null
  if (typeof fan.state !== "string" || !STATES.has(fan.state)) return null
  if (typeof fan.spread !== "string" || !Object.hasOwn(POSITIONS, fan.spread)) return null
  const spread = fan.spread as FanSpread
  const needed = POSITIONS[spread]
  if (fan.size !== needed + SPARE_CARDS) return null
  if (!Array.isArray(fan.picks) || fan.picks.length > needed) return null
  const picks: number[] = []
  for (const pick of fan.picks) {
    if (typeof pick !== "number" || !Number.isInteger(pick) || pick < 0 || pick >= fan.size || picks.includes(pick)) return null
    picks.push(pick)
  }
  if (fan.state === "revealed" && picks.length !== needed) return null
  return { kind: "card-fan", state: fan.state as CardFan["state"], spread, size: fan.size, picks }
}

/** The accessible name of a fan card: its place, that it is face-down, and whether it is picked. */
export function fanCardLabel(index: number, size: number, picked: boolean): string {
  return `card ${index + 1} of ${size}, face-down, ${picked ? "picked" : "not picked"}`
}
