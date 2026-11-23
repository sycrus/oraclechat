import { describe, expect, it } from "vitest"
import { BirthDetailsError, parseBirthDetails } from "../../src/astrology/details.js"
import { searchPlaces } from "../../src/astrology/places.js"

const today = new Date("2026-11-23T12:00:00Z")
const placeId = searchPlaces("san francisco")[0]!.id
const valid = { date: "1990-07-01", time: "12:00", placeId, consent: true }
const reject = (body: unknown) => {
  try { parseBirthDetails(body, today) } catch (error) { expect(error).toBeInstanceOf(BirthDetailsError); return (error as Error).message }
  throw new Error("expected a rejection")
}

describe("birth details validation", () => {
  it("accepts a real date, a time and a listed place with consent", () => {
    expect(parseBirthDetails(valid, today)).toEqual({ date: "1990-07-01", time: "12:00", placeId })
  })

  it("requires explicit consent", () => {
    expect(reject({ ...valid, consent: undefined })).toMatch(/consent/)
    expect(reject({ ...valid, consent: "yes" })).toMatch(/consent/)
  })

  it("rejects dates that don't exist, are in the future or are before 1800", () => {
    expect(reject({ ...valid, date: "1990-02-30" })).toMatch(/date/)
    expect(reject({ ...valid, date: "2027-01-01" })).toMatch(/date/)
    expect(reject({ ...valid, date: "1799-12-31" })).toMatch(/date/)
    expect(reject({ ...valid, date: "1990-7-1" })).toMatch(/date/)
  })

  it("rejects times outside 00:00 to 23:59", () => {
    expect(reject({ ...valid, time: "24:00" })).toMatch(/time/)
    expect(reject({ ...valid, time: "12:60" })).toMatch(/time/)
    expect(reject({ ...valid, time: "9:30" })).toMatch(/time/)
    expect(parseBirthDetails({ ...valid, time: "00:00" }, today).time).toBe("00:00")
  })

  it("rejects a place that is not in the list", () => {
    expect(reject({ ...valid, placeId: -1 })).toMatch(/place/)
    expect(reject({ ...valid, placeId: "San Francisco" })).toMatch(/place/)
  })

  it("rejects a non-object body", () => {
    expect(reject(null)).toMatch(/consent|date/)
  })
})
