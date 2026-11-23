import { describe, expect, it } from "vitest"
import { parseBirthForm, parsePlaces, placeLabel } from "./birth-form"

describe("birth-details form kind", () => {
  it("accepts open, submitted and set-aside forms", () => {
    for (const state of ["open", "submitted", "set-aside"] as const) {
      expect(parseBirthForm({ kind: "birth-details", state })).toEqual({ kind: "birth-details", state })
    }
  })

  it("rejects other kinds, unknown states and extra details", () => {
    expect(parseBirthForm({ kind: "coin-toss", state: "open" })).toBeNull()
    expect(parseBirthForm({ kind: "birth-details", state: "done" })).toBeNull()
    expect(parseBirthForm(null)).toBeNull()
  })
})

describe("places", () => {
  const sf = { id: 5391959, name: "San Francisco", region: "California", country: "United States", latitude: 37.7749, longitude: -122.4194, timeZone: "America/Los_Angeles" }

  it("labels a place with its region and country", () => {
    expect(placeLabel(sf)).toBe("San Francisco, California, United States")
    expect(placeLabel({ ...sf, region: "" })).toBe("San Francisco, United States")
  })

  it("keeps only well-formed places from a search response", () => {
    expect(parsePlaces({ places: [sf, { id: "x" }, null] })).toEqual([sf])
    expect(parsePlaces({})).toEqual([])
  })
})
