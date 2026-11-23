import { randomInt } from "node:crypto"
import { hexagrams, type Hexagram } from "./hexagrams.js"

export interface IChingLine {
  value: 6 | 7 | 8 | 9
  yang: boolean
  changing: boolean
}

export interface IChingReading {
  method: "i-ching"
  lines: IChingLine[]
  primary: Hexagram
  relating?: Hexagram
}

// King Wen numbers, indexed [lower trigram][upper trigram]; trigrams in the order
// Qian, Zhen, Kan, Gen, Kun, Xun, Li, Dui.
const KING_WEN = [
  [1, 34, 5, 26, 11, 9, 14, 43],
  [25, 51, 3, 27, 24, 42, 21, 17],
  [6, 40, 29, 4, 7, 59, 64, 47],
  [33, 62, 39, 52, 15, 53, 56, 31],
  [12, 16, 8, 23, 2, 20, 35, 45],
  [44, 32, 48, 18, 46, 57, 50, 28],
  [13, 55, 63, 22, 36, 37, 30, 49],
  [10, 54, 60, 41, 19, 61, 38, 58],
]
// A trigram's three lines, bottom to top, as a 3-bit number with the bottom line in bit 0.
const TRIGRAM_INDEX: Record<number, number> = { 0b111: 0, 0b001: 1, 0b010: 2, 0b100: 3, 0b000: 4, 0b110: 5, 0b101: 6, 0b011: 7 }

function defaultRandom(): number { return randomInt(0, 0x100000000) / 0x100000000 }

/** King Wen number for six lines given bottom to top (true = yang). */
export function hexagramFor(yang: boolean[]): number {
  const trigram = (lines: boolean[]) => TRIGRAM_INDEX[lines.reduce((bits, isYang, index) => bits | (isYang ? 1 << index : 0), 0)]!
  return KING_WEN[trigram(yang.slice(0, 3))]![trigram(yang.slice(3, 6))]!
}

const hexagram = (number: number): Hexagram => hexagrams.find((entry) => entry.number === number)!

export function castIChing(random: () => number = defaultRandom): IChingReading {
  const lines: IChingLine[] = Array.from({ length: 6 }, () => {
    const value = [0, 1, 2].reduce((sum) => sum + (random() < 0.5 ? 3 : 2), 0) as IChingLine["value"]
    return { value, yang: value % 2 === 1, changing: value === 6 || value === 9 }
  })
  const primary = hexagram(hexagramFor(lines.map((line) => line.yang)))
  if (!lines.some((line) => line.changing)) return { method: "i-ching", lines, primary }
  const relating = hexagram(hexagramFor(lines.map((line) => line.changing ? !line.yang : line.yang)))
  return { method: "i-ching", lines, primary, relating }
}
