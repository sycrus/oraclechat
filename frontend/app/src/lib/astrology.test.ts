import { describe, expect, it } from "vitest"
import { aspectLabel, parseAstrologyReading, placementLabel, spreadLongitudes, transitLabel, wheelPoint, type AstrologyReading } from "./astrology"

const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const

function chart(): AstrologyReading {
  return {
    method: "natal-transits",
    computedAt: "2026-11-23T12:00:00.000Z",
    natal: {
      planets: PLANETS.map((point, index) => {
        const longitude = index * 33 + 12.5
        return { point, longitude, sign: SIGNS[Math.floor(longitude / 30)]!, degree: longitude % 30, house: (index % 12) + 1, retrograde: point === "saturn" }
      }),
      ascendant: { longitude: 176.38, sign: "virgo", degree: 26.38 },
      midheaven: { longitude: 85.82, sign: "gemini", degree: 25.82 },
      aspects: [{ a: "sun", b: "mercury", aspect: "conjunction", orb: 1.3 }],
    },
    transits: [{ planet: "saturn", aspect: "square", natal: "moon", orb: 0.4, house: 7 }],
  }
}

const withPlanet = (index: number, change: Record<string, unknown>) => {
  const value = chart()
  value.natal.planets[index] = { ...value.natal.planets[index]!, ...change } as never
  return value
}

describe("astrology reading parser", () => {
  it("accepts a valid chart and keeps it whole", () => {
    expect(parseAstrologyReading(chart())).toEqual(chart())
  })

  it("keeps a birth-time note", () => {
    expect(parseAstrologyReading({ ...chart(), note: "ambiguous" })?.note).toBe("ambiguous")
    expect(parseAstrologyReading({ ...chart(), note: "unknown" })).toBeNull()
  })

  it("rejects other readings and junk", () => {
    expect(parseAstrologyReading(null)).toBeNull()
    expect(parseAstrologyReading({ method: "i-ching" })).toBeNull()
    expect(parseAstrologyReading({ ...chart(), natal: undefined })).toBeNull()
  })

  it("rejects a missing or repeated planet", () => {
    const missing = chart(); missing.natal.planets.pop()
    expect(parseAstrologyReading(missing)).toBeNull()
    const repeated = chart(); repeated.natal.planets[9] = { ...repeated.natal.planets[0]! }
    expect(parseAstrologyReading(repeated)).toBeNull()
  })

  it("rejects degrees of 30 or more, negative degrees and unknown signs", () => {
    expect(parseAstrologyReading(withPlanet(0, { degree: 30 }))).toBeNull()
    expect(parseAstrologyReading(withPlanet(0, { degree: -1 }))).toBeNull()
    expect(parseAstrologyReading(withPlanet(0, { sign: "ophiuchus" }))).toBeNull()
  })

  it("rejects houses outside 1 to 12", () => {
    expect(parseAstrologyReading(withPlanet(0, { house: 13 }))).toBeNull()
    expect(parseAstrologyReading(withPlanet(0, { house: 0 }))).toBeNull()
    expect(parseAstrologyReading(withPlanet(0, { house: 2.5 }))).toBeNull()
  })

  it("rejects aspects and transits naming unknown points or aspects", () => {
    const badAspect = chart(); badAspect.natal.aspects = [{ a: "sun", b: "chiron" as never, aspect: "trine", orb: 1 }]
    expect(parseAstrologyReading(badAspect)).toBeNull()
    const badKind = chart(); badKind.natal.aspects = [{ a: "sun", b: "moon", aspect: "quincunx" as never, orb: 1 }]
    expect(parseAstrologyReading(badKind)).toBeNull()
    const badTransit = chart(); badTransit.transits = [{ planet: "moon" as never, aspect: "square", natal: "sun", orb: 1, house: 2 }]
    expect(parseAstrologyReading(badTransit)).toBeNull()
  })
})

describe("chart labels", () => {
  it("reads a placement as text", () => {
    expect(placementLabel({ point: "moon", longitude: 102.4, sign: "cancer", degree: 12.4, house: 4, retrograde: false })).toBe("Moon in Cancer, 12°, 4th house")
    expect(placementLabel({ point: "saturn", longitude: 292.97, sign: "capricorn", degree: 22.97, house: 5, retrograde: true })).toBe("Saturn in Capricorn, 22°, 5th house, retrograde")
  })

  it("reads aspects and transits as text", () => {
    expect(aspectLabel({ a: "sun", b: "ascendant", aspect: "trine", orb: 2.25 })).toBe("Sun trine Ascendant, orb 2.3°")
    expect(transitLabel({ planet: "saturn", aspect: "square", natal: "moon", orb: 0.4, house: 7 })).toBe("Saturn square your Moon, orb 0.4°, through your 7th house")
  })
})

describe("wheel geometry", () => {
  it("puts the ascendant at 9 o'clock and runs the zodiac counter-clockwise", () => {
    const at = (longitude: number) => { const { x, y } = wheelPoint(longitude, 176.38, 100); return { x: Math.round(x) + 0, y: Math.round(y) + 0 } }
    expect(at(176.38)).toEqual({ x: -100, y: 0 })
    expect(at(176.38 + 90)).toEqual({ x: 0, y: 100 })
    expect(at(176.38 + 180)).toEqual({ x: 100, y: 0 })
  })

  it("nudges crowded planets apart while keeping their order", () => {
    const spread = spreadLongitudes([10, 11, 12, 200], 6)
    expect(spread[1]! - spread[0]!).toBeGreaterThanOrEqual(6 - 1e-9)
    expect(spread[2]! - spread[1]!).toBeGreaterThanOrEqual(6 - 1e-9)
    expect(spread[3]).toBe(200)
  })
})
