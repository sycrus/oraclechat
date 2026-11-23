import { describe, expect, it } from "vitest"
import { localToUtc } from "../../src/astrology/time.js"

describe("local birth time to UTC", () => {
  it("applies daylight saving time in force on the birth date", () => {
    expect(localToUtc("1990-07-01", "12:00", "America/New_York")).toEqual({ utc: new Date("1990-07-01T16:00:00Z") })
  })

  it("applies standard time in winter", () => {
    expect(localToUtc("1990-01-15", "12:00", "America/New_York")).toEqual({ utc: new Date("1990-01-15T17:00:00Z") })
  })

  it("handles zones with fractional offsets", () => {
    expect(localToUtc("2000-03-10", "09:30", "Asia/Kolkata")).toEqual({ utc: new Date("2000-03-10T04:00:00Z") })
  })

  it("takes the earlier instant of a time that happens twice", () => {
    // 2021-11-07 01:30 happens at 05:30Z (EDT) and again at 06:30Z (EST).
    expect(localToUtc("2021-11-07", "01:30", "America/New_York")).toEqual({ utc: new Date("2021-11-07T05:30:00Z"), note: "ambiguous" })
  })

  it("moves a time that never happened forward by the gap", () => {
    // 2021-03-14 02:30 doesn't exist in New York: clocks jumped from 02:00 to 03:00.
    expect(localToUtc("2021-03-14", "02:30", "America/New_York")).toEqual({ utc: new Date("2021-03-14T07:30:00Z"), note: "skipped" })
  })

  it("works south of the equator, where DST falls in January", () => {
    expect(localToUtc("2020-01-10", "08:00", "Australia/Sydney")).toEqual({ utc: new Date("2020-01-09T21:00:00Z") })
  })
})
