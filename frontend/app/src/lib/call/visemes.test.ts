import { describe, expect, it } from "vitest"
import { VISEMES, visemeWeights } from "./visemes"

describe("visemeWeights", () => {
  it("maps each detected vowel to its VRM mouth shape", () => {
    expect(visemeWeights({ A: 1 }, 1).aa).toBe(1)
    expect(visemeWeights({ I: 1 }, 1).ih).toBe(1)
    expect(visemeWeights({ U: 1 }, 1).ou).toBe(1)
    expect(visemeWeights({ E: 1 }, 1).ee).toBe(1)
    expect(visemeWeights({ O: 1 }, 1).oh).toBe(1)
  })

  it("makes the dominant vowel the strongest shape", () => {
    const weights = visemeWeights({ A: 0.1, I: 0.05, U: 0.1, E: 0.05, O: 0.7 }, 0.8)
    const strongest = VISEMES.reduce((best, name) => (weights[name] > weights[best] ? name : best))
    expect(strongest).toBe("oh")
  })

  it("scales by loudness", () => {
    expect(visemeWeights({ A: 0.8 }, 0.5).aa).toBeCloseTo(0.4)
  })

  it("closes every shape in silence", () => {
    expect(visemeWeights({ A: 1, I: 1, U: 1, E: 1, O: 1 }, 0)).toEqual({ aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 })
  })

  it("ignores silence and unknown keys and returns all five shapes", () => {
    expect(visemeWeights({ S: 1, X: 1 }, 1)).toEqual({ aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 })
  })

  it("clamps to 0..1", () => {
    expect(visemeWeights({ A: 2, I: -1 }, 1.5)).toMatchObject({ aa: 1, ih: 0 })
  })
})
