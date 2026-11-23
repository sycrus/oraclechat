import { describe, expect, it } from "vitest"
import { hexagramFor } from "../../src/iching/cast.js"
import { completeToss, drawToss, type TossLine } from "../../src/iching/toss.js"

const line = (value: 6 | 7 | 8 | 9): TossLine => ({ value, yang: value % 2 === 1, changing: value === 6 || value === 9 })

describe("drawToss", () => {
  it("pre-casts six hidden values and shows no lines", () => {
    const toss = drawToss()
    expect(toss).toMatchObject({ kind: "coin-toss", state: "casting", lines: [] })
    expect(toss.remaining).toHaveLength(6)
    for (const value of toss.remaining!) expect([6, 7, 8, 9]).toContain(value)
  })

  it("casts each throw with the three-coin method", () => {
    expect(drawToss(() => 0.1).remaining).toEqual([9, 9, 9, 9, 9, 9]) // every coin shows its 3 side
    expect(drawToss(() => 0.9).remaining).toEqual([6, 6, 6, 6, 6, 6]) // every coin shows its 2 side
  })
})

describe("completeToss", () => {
  it("forms the primary hexagram from the cast lines, with no relating hexagram when none change", () => {
    const reading = completeToss([7, 7, 7, 7, 7, 7].map(line))
    expect(reading.method).toBe("i-ching")
    expect(reading.lines).toEqual([7, 7, 7, 7, 7, 7].map(line))
    expect(reading.primary.number).toBe(hexagramFor([true, true, true, true, true, true]))
    expect(reading.primary.name).toBeTruthy()
    expect(reading.relating).toBeUndefined()
  })

  it("derives the relating hexagram from the changing lines", () => {
    const reading = completeToss([9, 7, 7, 7, 7, 7].map(line)) // bottom yang changing flips it to yin: 1 → 44
    expect(reading.primary.number).toBe(1)
    expect(reading.relating?.number).toBe(44)
  })

  it("rejects anything that is not six well-formed lines", () => {
    expect(() => completeToss([7, 7, 7, 7, 7, 7].map(line).slice(0, 5))).toThrow()
    expect(() => completeToss([{ value: 5, yang: true, changing: false } as TossLine])).toThrow()
    expect(() => completeToss([{ value: 7, yang: false, changing: false } as TossLine])).toThrow()
  })
})
