import { describe, expect, it } from "vitest"
import { astrologyCatalog } from "../../src/astrology/catalog.js"
import { computeChart } from "../../src/astrology/chart.js"
import { chartForTeller } from "../../src/astrology/teller-view.js"
import { reference } from "./fixtures/reference-1990-07-01.js"

const chart = computeChart(reference.birth, new Date("2026-07-15T12:00:00Z"))
const leaks = ["1990", "12:00", "16:00", "40.71", "74.0", "America/New_York", "New York"]

describe("chart as a teller sees it", () => {
  it("gives the precise view with degrees, retrograde marks and transit orbs", () => {
    const text = chartForTeller(chart, { precise: true })
    expect(text).toMatch(/Sun in Cancer 9\.\d+°, 11th house/)
    expect(text).toMatch(/Saturn in Capricorn [\d.]+° \(retrograde\)/)
    expect(text).toMatch(/Ascendant in Virgo 26\.\d+°/)
    expect(text).toMatch(/orb [\d.]+°/)
  })

  it("gives the coarse view with signs and houses but no degrees or orbs", () => {
    const text = chartForTeller(chart, { precise: false })
    expect(text).toMatch(/Sun in Cancer, 11th house/)
    expect(text).toMatch(/Saturn in Capricorn \(retrograde\)/)
    expect(text).toMatch(/Ascendant in Virgo/)
    expect(text).not.toMatch(/\d°/)
    expect(text).not.toMatch(/orb/i)
  })

  it("includes catalog meanings for the transits", () => {
    const text = chartForTeller(chart, { precise: false })
    const [first] = chart.transits
    expect(first).toBeDefined()
    expect(text).toContain(astrologyCatalog.planets[first!.planet].meaning)
    expect(text).toContain(astrologyCatalog.aspects[first!.aspect].meaning)
    expect(text).toContain(astrologyCatalog.houses[String(first!.house)]!.meaning)
  })

  it("never contains the birth date, time or place, in either view", () => {
    for (const precise of [true, false]) {
      const text = chartForTeller(chart, { precise })
      for (const leak of leaks) expect(text, `${precise ? "precise" : "coarse"}: ${leak}`).not.toContain(leak)
    }
  })

  it("mentions an ambiguous birth time without giving it", () => {
    const ambiguous = computeChart({ ...reference.birth, date: "2021-11-07", time: "01:30" }, new Date("2026-07-15T12:00:00Z"))
    const text = chartForTeller(ambiguous, { precise: true })
    expect(text).toMatch(/birth time happened twice/i)
    expect(text).not.toContain("01:30")
  })
})
