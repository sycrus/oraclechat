import { describe, expect, it } from "vitest"
import { parseIChingReading, shortName, trigrams } from "./iching"

const line = (value: number) => ({ value, yang: value % 2 === 1, changing: value === 6 || value === 9 })
const hexagram = (number: number) => ({ number, name: `Hexagram ${number}`, meaning: "A reflection." })

describe("I Ching reading validation", () => {
  const stable = { method: "i-ching", lines: [7, 8, 7, 8, 7, 8].map(line), primary: hexagram(1) }
  const changing = { method: "i-ching", lines: [7, 9, 7, 8, 7, 6].map(line), primary: hexagram(2), relating: hexagram(3) }

  it("accepts a stable casting and a casting with changing lines", () => {
    expect(parseIChingReading(stable)).toEqual(stable)
    expect(parseIChingReading(changing)).toEqual(changing)
  })

  it("rejects the wrong line count and values outside 6 to 9", () => {
    expect(parseIChingReading({ ...stable, lines: stable.lines.slice(0, 5) })).toBeNull()
    expect(parseIChingReading({ ...stable, lines: [7, 8, 7, 8, 7, 10].map((value) => ({ value, yang: true, changing: false })) })).toBeNull()
  })

  it("rejects inconsistent line flags", () => {
    expect(parseIChingReading({ ...stable, lines: [{ value: 7, yang: false, changing: false }, ...stable.lines.slice(1)] })).toBeNull()
    expect(parseIChingReading({ ...stable, lines: [{ value: 7, yang: true, changing: true }, ...stable.lines.slice(1)] })).toBeNull()
  })

  it("rejects bad hexagram numbers and a relating hexagram without a changing line", () => {
    expect(parseIChingReading({ ...stable, primary: hexagram(65) })).toBeNull()
    expect(parseIChingReading({ ...stable, primary: { number: 1, name: "", meaning: "x" } })).toBeNull()
    expect(parseIChingReading({ ...stable, relating: hexagram(2) })).toBeNull()
    expect(parseIChingReading({ ...changing, relating: undefined })).toBeNull()
  })

  it("rejects other shapes", () => {
    expect(parseIChingReading(null)).toBeNull()
    expect(parseIChingReading({ spread: "three-card", cards: [] })).toBeNull()
  })
})

describe("trigrams", () => {
  it("names the lower and upper trigrams from the lines, bottom first", () => {
    expect(trigrams([9, 8, 8, 8, 8, 6].map(line) as never)).toEqual({ lower: "Thunder", upper: "Earth" })
    expect(trigrams([8, 8, 8, 8, 8, 7].map(line) as never)).toEqual({ lower: "Earth", upper: "Mountain" })
    expect(trigrams([7, 7, 7, 7, 8, 7].map(line) as never)).toEqual({ lower: "Heaven", upper: "Fire" })
  })
})

describe("shortName", () => {
  it("drops the transliteration before the comma", () => {
    expect(shortName("Fu, Return")).toBe("Return")
    expect(shortName("Return")).toBe("Return")
  })
})
