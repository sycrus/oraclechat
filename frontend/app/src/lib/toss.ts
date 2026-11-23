/** The I Ching coin toss as the browser sees it (ADR-0017): the lines tossed so far only. Unthrown throws stay on the server. */
import type { IChingLine } from "./iching"

export type TossLine = IChingLine

export interface CoinToss {
  kind: "coin-toss"
  state: "casting" | "revealed" | "set-aside"
  /** Lines tossed so far, bottom to top. */
  lines: TossLine[]
}

const STATES = new Set(["casting", "revealed", "set-aside"])
const VALUES = [6, 7, 8, 9]

const isLine = (value: unknown): value is TossLine => {
  if (typeof value !== "object" || value === null) return false
  const line = value as TossLine
  if (!VALUES.includes(line.value)) return false
  return line.yang === (line.value % 2 === 1) && line.changing === (line.value === 6 || line.value === 9)
}

/** Validates toss data from the server; anything else is rejected and the message is shown as plain text. */
export function parseTossInteraction(value: unknown): CoinToss | null {
  if (!value || typeof value !== "object") return null
  const toss = value as Record<string, unknown>
  if (toss.kind !== "coin-toss") return null
  if (typeof toss.state !== "string" || !STATES.has(toss.state)) return null
  if (!Array.isArray(toss.lines) || toss.lines.length > 6 || !toss.lines.every(isLine)) return null
  if (toss.state === "revealed" && toss.lines.length !== 6) return null
  const lines = (toss.lines as TossLine[]).map((line) => ({ value: line.value, yang: line.yang, changing: line.changing }))
  return { kind: "coin-toss", state: toss.state as CoinToss["state"], lines }
}

/** The three coin faces a thrown value stands for: 3 is the heads (yang) side, 2 the tails (yin) one. Each value maps to exactly one combination. */
export function coinFaces(value: TossLine["value"]): (3 | 2)[] {
  switch (value) {
    case 9: return [3, 3, 3]
    case 8: return [3, 3, 2]
    case 7: return [3, 2, 2]
    case 6: return [2, 2, 2]
  }
}

/** How one landed throw reads: the heads and tails that came up, and the line they form. */
export function throwLabel(value: TossLine["value"]): string {
  const heads = value - 6
  const headsText = `${heads} ${heads === 1 ? "head" : "heads"}`
  const tailsText = `${3 - heads} ${3 - heads === 1 ? "tail" : "tails"}`
  const line = value === 9 ? "changing yang" : value === 8 ? "steady yin" : value === 7 ? "steady yang" : "changing yin"
  return `${headsText}, ${tailsText} — ${line}`
}

/** The cast as it is becoming: every changing line already flipped to its new shape, steady lines untouched. */
export function becomingLines(lines: TossLine[]): TossLine[] {
  return lines.map((line) => line.changing ? { ...line, yang: !line.yang, changing: false } : line)
}

/** The accessible name of a tossed line: its place, its shape, and whether it is changing. */
export function lineLabel(place: number, total: number, line: TossLine): string {
  return `line ${place} of ${total}, ${line.yang ? "solid yang" : "broken yin"}, ${line.changing ? "changing" : "steady"}`
}
