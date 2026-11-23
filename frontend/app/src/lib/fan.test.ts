import { describe, expect, it } from "vitest"
import { cardsNeeded, fanCardLabel, parseCardFan } from "./fan"

const open = { kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [] }

describe("parseCardFan", () => {
  it("accepts open, revealed and set-aside fans", () => {
    expect(parseCardFan(open)).toEqual(open)
    expect(parseCardFan({ ...open, picks: [4, 0] })).toEqual({ ...open, picks: [4, 0] })
    expect(parseCardFan({ ...open, state: "revealed", picks: [4, 0, 7] })).toMatchObject({ state: "revealed" })
    expect(parseCardFan({ ...open, state: "set-aside", picks: [1] })).toMatchObject({ state: "set-aside" })
  })

  it("accepts each spread with its own fan size", () => {
    expect(parseCardFan({ ...open, spread: "one-card", size: 7 })).not.toBeNull()
    expect(parseCardFan({ ...open, spread: "celtic-cross", size: 16 })).not.toBeNull()
  })

  it("rejects what is not a fan", () => {
    for (const value of [undefined, null, "fan", 3, [], {}, { ...open, kind: "coin-toss" }]) expect(parseCardFan(value)).toBeNull()
  })

  it("rejects an unknown state or spread, and a size that does not match the spread", () => {
    expect(parseCardFan({ ...open, state: "dealt" })).toBeNull()
    expect(parseCardFan({ ...open, spread: "five-card" })).toBeNull()
    expect(parseCardFan({ ...open, size: 8 })).toBeNull()
    expect(parseCardFan({ ...open, spread: "celtic-cross" })).toBeNull()
  })

  it("rejects picks that are duplicated, out of range, not whole numbers or too many", () => {
    expect(parseCardFan({ ...open, picks: [1, 1] })).toBeNull()
    expect(parseCardFan({ ...open, picks: [9] })).toBeNull()
    expect(parseCardFan({ ...open, picks: [-1] })).toBeNull()
    expect(parseCardFan({ ...open, picks: [1.5] })).toBeNull()
    expect(parseCardFan({ ...open, picks: ["1"] })).toBeNull()
    expect(parseCardFan({ ...open, picks: [0, 1, 2, 3] })).toBeNull()
    expect(parseCardFan({ ...open, picks: "none" })).toBeNull()
  })

  it("needs every pick for a revealed fan", () => {
    expect(parseCardFan({ ...open, state: "revealed", picks: [1, 2] })).toBeNull()
  })

  it("ignores extra fields, so hidden card data would never be carried through", () => {
    const parsed = parseCardFan({ ...open, hidden: [{ name: "The Fool" }] })
    expect(parsed).toEqual(open)
    expect(parsed).not.toHaveProperty("hidden")
  })
})

describe("cardsNeeded", () => {
  it("is the number of positions in the spread", () => {
    expect(cardsNeeded("one-card")).toBe(1)
    expect(cardsNeeded("three-card")).toBe(3)
    expect(cardsNeeded("celtic-cross")).toBe(10)
  })
})

describe("fanCardLabel", () => {
  it("gives the place in the fan, that it is face-down, and whether it is picked", () => {
    expect(fanCardLabel(3, 9, false)).toBe("card 4 of 9, face-down, not picked")
    expect(fanCardLabel(0, 9, true)).toBe("card 1 of 9, face-down, picked")
  })
})
