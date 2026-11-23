import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getPlace, searchPlaces } from "../../src/astrology/places.js"

describe("offline place lookup", () => {
  beforeEach(() => { vi.stubGlobal("fetch", () => { throw new Error("network is off") }) })
  afterEach(() => { vi.unstubAllGlobals() })

  it("finds San Francisco with its coordinates and time zone", () => {
    const match = searchPlaces("san fr").find((place) => place.name === "San Francisco" && place.country === "United States")
    expect(match).toMatchObject({ region: "California", timeZone: "America/Los_Angeles" })
    expect(match!.latitude).toBeCloseTo(37.77, 1)
    expect(match!.longitude).toBeCloseTo(-122.42, 1)
  })

  it("tells same-named cities apart by region and country, biggest first, at most 10", () => {
    const matches = searchPlaces("springfield")
    expect(matches.length).toBeGreaterThan(1)
    expect(matches.length).toBeLessThanOrEqual(10)
    expect(new Set(matches.map((place) => `${place.region}, ${place.country}`)).size).toBe(matches.length)
    expect(matches.every((place) => place.name.startsWith("Springfield"))).toBe(true)
  })

  it("ignores case and accents", () => {
    expect(searchPlaces("SAO PAULO")[0]).toMatchObject({ name: "São Paulo", country: "Brazil" })
    expect(searchPlaces("zürich")[0]).toMatchObject({ country: "Switzerland" })
  })

  it("returns nothing for a blank or one-letter query", () => {
    expect(searchPlaces("")).toEqual([])
    expect(searchPlaces(" a ")).toEqual([])
  })

  it("looks a place up by id", () => {
    const [first] = searchPlaces("san francisco")
    expect(getPlace(first!.id)).toEqual(first)
    expect(getPlace(-1)).toBeUndefined()
  })
})
