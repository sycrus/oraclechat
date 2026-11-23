/** The I Ching coin toss (ADR-0017): the app pre-casts six throws, the user tosses them out one by one, and the completed cast is the reading. */
import { randomInt } from "node:crypto"
import { hexagramFor, type IChingLine, type IChingReading } from "./cast.js"
import { hexagrams, type Hexagram } from "./hexagrams.js"

export type TossLine = IChingLine

/** Server-side state of a coin-toss message. `remaining` holds the pre-cast values (6-9) not yet tossed and never leaves the server. */
export interface TossInteraction {
  kind: "coin-toss"
  state: "casting" | "revealed" | "set-aside"
  /** Lines tossed so far, bottom to top. */
  lines: TossLine[]
  remaining?: number[]
}

/** What the browser may see: the cast so far, never the throws still to come. */
export type PublicToss = Omit<TossInteraction, "remaining">

function defaultRandom(): number { return randomInt(0, 0x100000000) / 0x100000000 }

/** One throw of three coins: each coin shows its 3 side or its 2 side, so a throw is 6, 7, 8 or 9. */
function threeCoins(random: () => number): 6 | 7 | 8 | 9 {
  return [0, 1, 2].reduce((sum) => sum + (random() < 0.5 ? 3 : 2), 0) as 6 | 7 | 8 | 9
}

const toLine = (value: number): TossLine => ({ value: value as TossLine["value"], yang: value % 2 === 1, changing: value === 6 || value === 9 })

const hexagramByNumber = (number: number): Hexagram => hexagrams.find((entry) => entry.number === number)!

/** Lays out a toss: six throws are decided now and stay hidden until tossed, one per line, bottom to top. */
export function drawToss(random: () => number = defaultRandom): TossInteraction {
  return { kind: "coin-toss", state: "casting", lines: [], remaining: Array.from({ length: 6 }, () => threeCoins(random)) }
}

/** Forms the reading from the six cast lines by the app-owned casting rules. Throws for anything else. */
export function completeToss(lines: TossLine[]): IChingReading {
  if (lines.length !== 6 || lines.some((line) => line.value !== 6 && line.value !== 7 && line.value !== 8 && line.value !== 9
    || line.yang !== (line.value % 2 === 1) || line.changing !== (line.value === 6 || line.value === 9))) {
    throw new Error("A completed toss needs exactly six well-formed lines")
  }
  const primary = hexagramByNumber(hexagramFor(lines.map((line) => line.yang)))
  if (!lines.some((line) => line.changing)) return { method: "i-ching", lines, primary }
  const relating = hexagramByNumber(hexagramFor(lines.map((line) => line.changing ? !line.yang : line.yang)))
  return { method: "i-ching", lines, primary, relating }
}
