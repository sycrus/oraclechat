import * as Astronomy from "astronomy-engine"
import { describe, expect, it } from "vitest"
import { computeChart, findAspect, PLANETS, SIGNS } from "../../src/astrology/chart.js"
import { reference } from "./fixtures/reference-1990-07-01.js"

const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const now = new Date("2026-11-23T12:00:00Z")

/** Where an ecliptic point (latitude 0) sits in the observer's sky, computed independently of chart.ts. */
function skyOf(longitude: number, utc: Date, latitude: number, east: number) {
  const time = Astronomy.MakeTime(utc)
  const tilt = Astronomy.e_tilt(time).tobl * Math.PI / 180
  const l = longitude * Math.PI / 180
  const ra = ((Math.atan2(Math.sin(l) * Math.cos(tilt), Math.cos(l)) * 180 / Math.PI + 360) % 360) / 15
  const dec = Math.asin(Math.sin(tilt) * Math.sin(l)) * 180 / Math.PI
  const horizon = Astronomy.Horizon(time, new Astronomy.Observer(latitude, east, 0), ra, dec)
  const localSidereal = (Astronomy.SiderealTime(time) * 15 + east + 360) % 360
  return { altitude: horizon.altitude, azimuth: horizon.azimuth, hourAngle: angle(localSidereal, ra * 15) }
}

describe("natal chart", () => {
  const chart = computeChart(reference.birth, now)
  const utc = new Date(reference.utc)

  it("places all ten planets within tolerance of JPL Horizons", () => {
    expect(chart.natal.planets.map((p) => p.point)).toEqual([...PLANETS])
    for (const planet of chart.natal.planets) {
      const tolerance = planet.point === "moon" ? 0.3 : 0.1
      expect(angle(planet.longitude, reference.longitudes[planet.point]), planet.point).toBeLessThan(tolerance)
    }
  })

  it("gives each planet a sign, a degree within the sign and a house", () => {
    for (const planet of chart.natal.planets) {
      expect(SIGNS[Math.floor(planet.longitude / 30)]).toBe(planet.sign)
      expect(planet.degree).toBeGreaterThanOrEqual(0)
      expect(planet.degree).toBeLessThan(30)
      expect(planet.house).toBeGreaterThanOrEqual(1)
      expect(planet.house).toBeLessThanOrEqual(12)
    }
    expect(chart.natal.planets.find((p) => p.point === "sun")?.sign).toBe("cancer")
    expect(chart.natal.planets.find((p) => p.point === "moon")?.sign).toBe("libra")
  })

  it("marks retrograde planets as Horizons shows them", () => {
    expect(chart.natal.planets.filter((p) => p.retrograde).map((p) => p.point)).toEqual([...reference.retrograde])
  })

  it("puts the ascendant on the eastern horizon and the midheaven on the meridian", () => {
    const { latitude, longitude } = reference.birth.place
    const ascendant = skyOf(chart.natal.ascendant.longitude, utc, latitude, longitude)
    expect(Math.abs(ascendant.altitude)).toBeLessThan(0.5)
    expect(ascendant.azimuth).toBeLessThan(180)
    expect(skyOf(chart.natal.midheaven.longitude, utc, latitude, longitude).hourAngle).toBeLessThan(0.5)
  })

  it("numbers whole-sign houses from the ascendant's sign", () => {
    const ascendantSign = SIGNS.indexOf(chart.natal.ascendant.sign)
    for (const planet of chart.natal.planets) {
      expect(planet.house).toBe(((SIGNS.indexOf(planet.sign) - ascendantSign + 12) % 12) + 1)
    }
  })

  it("gives every planet a house north of the Arctic Circle", () => {
    const tromso = computeChart({ date: "1990-12-21", time: "12:00", place: { latitude: 69.6496, longitude: 18.956, timeZone: "Europe/Oslo" } }, now)
    expect(tromso.natal.planets.every((p) => p.house >= 1 && p.house <= 12)).toBe(true)
    expect(Number.isFinite(tromso.natal.ascendant.longitude)).toBe(true)
  })

  it("lists natal aspects within their orbs, and none between the ascendant and midheaven", () => {
    for (const aspect of chart.natal.aspects) {
      expect(aspect.orb).toBeLessThanOrEqual(aspect.aspect === "sextile" ? 6 : 8)
      expect(new Set([aspect.a, aspect.b])).not.toEqual(new Set(["ascendant", "midheaven"]))
    }
    // Sun (99.56°) and Mercury (98.26°) are a 1.3° conjunction.
    expect(chart.natal.aspects).toContainEqual(expect.objectContaining({ a: "sun", b: "mercury", aspect: "conjunction" }))
  })

  it("records the computation time and has no note for an unambiguous time", () => {
    expect(chart.method).toBe("natal-transits")
    expect(chart.computedAt).toBe(now.toISOString())
    expect(chart.note).toBeUndefined()
  })

  it("notes an ambiguous birth time", () => {
    expect(computeChart({ ...reference.birth, date: "2021-11-07", time: "01:30" }, now).note).toBe("ambiguous")
  })
})

describe("aspects", () => {
  it("finds a square two degrees from exact", () => {
    expect(findAspect(10, 102)).toEqual({ aspect: "square", orb: 2 })
  })

  it("finds nothing between 67° apart", () => {
    expect(findAspect(10, 77)).toBeUndefined()
  })

  it("measures across 0° Aries", () => {
    expect(findAspect(358, 3)).toEqual({ aspect: "conjunction", orb: 5 })
    expect(findAspect(355, 5)).toBeUndefined()
  })
})

describe("transits", () => {
  const birth = reference.birth

  it("keeps the natal chart and changes the transits between dates", () => {
    const winter = computeChart(birth, new Date("2026-01-15T12:00:00Z"))
    const summer = computeChart(birth, new Date("2026-07-15T12:00:00Z"))
    expect(summer.natal).toEqual(winter.natal)
    expect(summer.transits).not.toEqual(winter.transits)
  })

  it("lists only transits from Mars and the outer planets within 2°, closest first, with a natal house", () => {
    const { transits } = computeChart(birth, new Date("2026-07-15T12:00:00Z"))
    expect(transits.length).toBeGreaterThan(0)
    for (const transit of transits) {
      expect(["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]).toContain(transit.planet)
      expect(transit.orb).toBeLessThanOrEqual(2)
      expect(transit.house).toBeGreaterThanOrEqual(1)
      expect(transit.house).toBeLessThanOrEqual(12)
    }
    expect(transits.map((t) => t.orb)).toEqual([...transits.map((t) => t.orb)].sort((a, b) => a - b))
  })
})
