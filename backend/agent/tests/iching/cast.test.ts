import { describe, expect, it } from "vitest"
import { castIChing, hexagramFor } from "../../src/iching/cast.js"
import { hexagrams } from "../../src/iching/hexagrams.js"

const cycle = (values: number[]) => { let index = 0; return () => values[index++ % values.length]! }

describe("I Ching casting", () => {
  it("casts six old-yang lines when every coin is heads, with a relating hexagram", () => {
    const reading = castIChing(() => 0)
    expect(reading.method).toBe("i-ching")
    expect(reading.lines).toHaveLength(6)
    expect(reading.lines.every((line) => line.value === 9 && line.yang && line.changing)).toBe(true)
    expect(reading.primary.number).toBe(1)
    expect(reading.relating?.number).toBe(2)
  })

  it("casts six old-yin lines when every coin is tails", () => {
    const reading = castIChing(() => 0.99)
    expect(reading.lines.every((line) => line.value === 6 && !line.yang && line.changing)).toBe(true)
    expect(reading.primary.number).toBe(2)
    expect(reading.relating?.number).toBe(1)
  })

  it("has no relating hexagram when no line changes", () => {
    const reading = castIChing(cycle([0, 0.99, 0.99]))
    expect(reading.lines.every((line) => line.value === 7 && line.yang && !line.changing)).toBe(true)
    expect(reading.primary.number).toBe(1)
    expect(reading.relating).toBeUndefined()
    expect("relating" in reading).toBe(false)
  })

  it("flips only the changing lines for the relating hexagram", () => {
    // bottom to top: 7, 7, 7, 7, 7, 6. The old-yin top line is yin as cast (lower Qian, upper Dui = 43) and flips to yang (1).
    const flips = [0, 0.99, 0.99, 0, 0.99, 0.99, 0, 0.99, 0.99, 0, 0.99, 0.99, 0, 0.99, 0.99, 0.99, 0.99, 0.99]
    const reading = castIChing(cycle(flips))
    expect(reading.lines.map((line) => line.value)).toEqual([7, 7, 7, 7, 7, 6])
    expect(reading.primary.number).toBe(43)
    expect(reading.relating?.number).toBe(1)
  })

  it("looks hexagrams up by King Wen number from the lines, bottom to top", () => {
    expect(hexagramFor([true, true, true, true, true, true])).toBe(1)
    expect(hexagramFor([false, false, false, false, false, false])).toBe(2)
    expect(hexagramFor([false, false, false, true, true, true])).toBe(12)
    expect(hexagramFor([true, false, true, false, true, false])).toBe(63)
    expect(hexagramFor([false, true, false, true, false, true])).toBe(64)
  })

  it("maps all 64 line combinations to distinct hexagrams", () => {
    const seen = new Set<number>()
    for (let bits = 0; bits < 64; bits += 1) seen.add(hexagramFor(Array.from({ length: 6 }, (_, i) => Boolean((bits >> i) & 1))))
    expect(seen.size).toBe(64)
  })

  it("casts valid values with the default random source", () => {
    for (let i = 0; i < 50; i += 1) {
      const reading = castIChing()
      expect(reading.lines.every((line) => [6, 7, 8, 9].includes(line.value))).toBe(true)
      expect(reading.lines.every((line) => line.yang === (line.value % 2 === 1) && line.changing === (line.value === 6 || line.value === 9))).toBe(true)
      expect(Boolean(reading.relating)).toBe(reading.lines.some((line) => line.changing))
    }
  })

  it("has 64 uniquely numbered hexagrams with a name and an original meaning", () => {
    expect(hexagrams).toHaveLength(64)
    expect(new Set(hexagrams.map((hexagram) => hexagram.number))).toEqual(new Set(Array.from({ length: 64 }, (_, i) => i + 1)))
    expect(new Set(hexagrams.map((hexagram) => hexagram.name)).size).toBe(64)
    expect(hexagrams.every((hexagram) => hexagram.name.trim() && hexagram.meaning.trim().length > 20)).toBe(true)
  })
})
