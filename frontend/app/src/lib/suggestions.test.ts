import { describe, expect, it } from "vitest"
import { chartSuggestions, ichingSuggestions } from "./suggestions"
import type { IChingReading } from "./iching"
import type { AstrologyReading } from "./astrology"

const line = (value: 6 | 7 | 8 | 9) => ({ value, yang: value % 2 === 1, changing: value === 6 || value === 9 })

describe("ichingSuggestions", () => {
  it("asks about the top changing line and the relating hexagram", () => {
    const reading: IChingReading = { method: "i-ching", lines: [9, 8, 8, 8, 8, 6].map((value) => line(value as 6 | 9)), primary: { number: 24, name: "Fu, Return", meaning: "m" }, relating: { number: 23, name: "Bo, Stripping Away", meaning: "m" } }
    const asked = ichingSuggestions(reading)
    expect(asked).toEqual(["What does line 6 mean?", "Why Stripping Away?", "How does this fit my question?"])
  })

  it("asks about the hexagram itself when nothing changes", () => {
    const reading: IChingReading = { method: "i-ching", lines: [7, 8, 7, 8, 7, 8].map((value) => line(value as 7 | 8)), primary: { number: 63, name: "Ji Ji, After Completion", meaning: "m" } }
    expect(ichingSuggestions(reading)).toEqual(["What does After Completion ask of me?", "How does this fit my question?"])
  })
})

describe("chartSuggestions", () => {
  const reading = {
    method: "natal-transits", computedAt: "2026-11-23T00:00:00Z",
    natal: {
      planets: [{ point: "sun", sign: "aries", degree: 14, longitude: 14, house: 3, retrograde: false }, { point: "saturn", sign: "aquarius", degree: 8, longitude: 308, house: 1, retrograde: false }],
      ascendant: { longitude: 321, sign: "aquarius", degree: 21 }, midheaven: { longitude: 252, sign: "sagittarius", degree: 12 }, aspects: [],
    },
    transits: [{ planet: "saturn", aspect: "conjunction", natal: "sun", orb: 1.4, house: 3 }],
  } as unknown as AstrologyReading

  it("asks about the selected planet, the closest transit and the rising sign", () => {
    expect(chartSuggestions(reading, "saturn")).toEqual(["What does Saturn in Aquarius mean?", "What does Saturn conjunction my Sun mean?", "Why does my Aquarius rising matter?"])
  })

  it("leaves out the transit question when there are none", () => {
    expect(chartSuggestions({ ...reading, transits: [] }, "sun")).toEqual(["What does Sun in Aries mean?", "Why does my Aquarius rising matter?"])
  })
})
