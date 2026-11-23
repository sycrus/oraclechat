export interface IChingLine {
  value: 6 | 7 | 8 | 9
  yang: boolean
  changing: boolean
}

export interface Hexagram {
  number: number
  name: string
  meaning: string
}

export interface IChingReading {
  method: "i-ching"
  lines: IChingLine[]
  primary: Hexagram
  relating?: Hexagram
}

function parseHexagram(value: unknown): Hexagram | null {
  if (!value || typeof value !== "object") return null
  const hexagram = value as Record<string, unknown>
  if (typeof hexagram.number !== "number" || !Number.isInteger(hexagram.number) || hexagram.number < 1 || hexagram.number > 64
      || typeof hexagram.name !== "string" || !hexagram.name.trim()
      || typeof hexagram.meaning !== "string" || !hexagram.meaning.trim()) return null
  return { number: hexagram.number, name: hexagram.name, meaning: hexagram.meaning }
}

export function parseIChingReading(value: unknown): IChingReading | null {
  if (!value || typeof value !== "object") return null
  const reading = value as Record<string, unknown>
  if (reading.method !== "i-ching" || !Array.isArray(reading.lines) || reading.lines.length !== 6) return null

  const lines: IChingLine[] = []
  for (const item of reading.lines) {
    if (!item || typeof item !== "object") return null
    const line = item as Record<string, unknown>
    if (line.value !== 6 && line.value !== 7 && line.value !== 8 && line.value !== 9) return null
    if (line.yang !== (line.value % 2 === 1) || line.changing !== (line.value === 6 || line.value === 9)) return null
    lines.push({ value: line.value, yang: line.yang, changing: line.changing })
  }

  const primary = parseHexagram(reading.primary)
  if (!primary) return null
  const anyChanging = lines.some((line) => line.changing)
  if (!anyChanging) return reading.relating === undefined ? { method: "i-ching", lines, primary } : null
  const relating = parseHexagram(reading.relating)
  return relating ? { method: "i-ching", lines, primary, relating } : null
}

const TRIGRAMS: Record<string, string> = { "111": "Heaven", "000": "Earth", "100": "Thunder", "010": "Water", "001": "Mountain", "011": "Wind", "101": "Fire", "110": "Lake" }

/** The lower and upper trigrams of a cast, read bottom to top (1 = yang). */
export function trigrams(lines: IChingLine[]): { lower: string; upper: string } {
  const name = (part: IChingLine[]) => TRIGRAMS[part.map((line) => (line.yang ? "1" : "0")).join("")]!
  return { lower: name(lines.slice(0, 3)), upper: name(lines.slice(3, 6)) }
}

/** "Fu, Return" → "Return": the English name without its transliteration. */
export const shortName = (name: string) => name.includes(",") ? name.slice(name.indexOf(",") + 1).trim() : name
