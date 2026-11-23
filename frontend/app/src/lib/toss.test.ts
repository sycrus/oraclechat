import { describe, expect, it } from "vitest"
import { becomingLines, coinFaces, lineLabel, parseTossInteraction, throwLabel } from "./toss"

const line = (value: 6 | 7 | 8 | 9) => ({ value, yang: value % 2 === 1, changing: value === 6 || value === 9 })

describe("parseTossInteraction", () => {
  it("accepts casting, revealed and set-aside tosses with well-formed lines", () => {
    expect(parseTossInteraction({ kind: "coin-toss", state: "casting", lines: [line(7), line(9)] })).toEqual({ kind: "coin-toss", state: "casting", lines: [line(7), line(9)] })
    expect(parseTossInteraction({ kind: "coin-toss", state: "revealed", lines: [line(7), line(7), line(7), line(7), line(7), line(7)] })).not.toBeNull()
    expect(parseTossInteraction({ kind: "coin-toss", state: "set-aside", lines: [] })).not.toBeNull()
  })

  it("rejects unknown kinds, states, malformed lines and over-long casts", () => {
    expect(parseTossInteraction({ kind: "card-fan", state: "casting", lines: [] })).toBeNull()
    expect(parseTossInteraction({ kind: "coin-toss", state: "open", lines: [] })).toBeNull()
    expect(parseTossInteraction({ kind: "coin-toss", state: "casting", lines: [{ value: 5, yang: true, changing: false }] })).toBeNull()
    expect(parseTossInteraction({ kind: "coin-toss", state: "casting", lines: [{ value: 7, yang: false, changing: false }] })).toBeNull()
    expect(parseTossInteraction({ kind: "coin-toss", state: "casting", lines: Array.from({ length: 7 }, () => line(7)) })).toBeNull()
    expect(parseTossInteraction(null)).toBeNull()
  })

  it("rejects a revealed toss that is not a full cast", () => {
    expect(parseTossInteraction({ kind: "coin-toss", state: "revealed", lines: [line(7), line(7)] })).toBeNull()
  })
})

describe("coinFaces", () => {
  it("maps each line value to its unique three-coin faces", () => {
    expect(coinFaces(9)).toEqual([3, 3, 3])
    expect(coinFaces(8)).toEqual([3, 3, 2])
    expect(coinFaces(7)).toEqual([3, 2, 2])
    expect(coinFaces(6)).toEqual([2, 2, 2])
  })
})

describe("throwLabel", () => {
  it("says how the coins landed and the line they form", () => {
    expect(throwLabel(9)).toBe("3 heads, 0 tails — changing yang")
    expect(throwLabel(8)).toBe("2 heads, 1 tail — steady yin")
    expect(throwLabel(7)).toBe("1 head, 2 tails — steady yang")
    expect(throwLabel(6)).toBe("0 heads, 3 tails — changing yin")
  })
})

describe("becomingLines", () => {
  it("flips the changing lines and leaves the steady ones alone", () => {
    const lines = [line(9), line(8), line(7), line(6)]
    expect(becomingLines(lines).map((line) => line.yang)).toEqual([false, false, true, true])
    expect(becomingLines(lines).every((line) => !line.changing)).toBe(true)
  })

  it("is the cast itself when nothing changes", () => {
    const lines = [line(7), line(8)]
    expect(becomingLines(lines)).toEqual(lines)
  })
})

describe("lineLabel", () => {
  it("describes the place and the line's state", () => {
    expect(lineLabel(1, 6, line(7))).toBe("line 1 of 6, solid yang, steady")
    expect(lineLabel(2, 6, line(6))).toBe("line 2 of 6, broken yin, changing")
    expect(lineLabel(6, 6, line(9))).toBe("line 6 of 6, solid yang, changing")
  })
})
