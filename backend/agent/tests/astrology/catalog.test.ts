import { describe, expect, it } from "vitest"
import { astrologyCatalog, astrologyContentProvenance } from "../../src/astrology/catalog.js"
import { ASPECTS, PLANETS, SIGNS } from "../../src/astrology/chart.js"

const complete = (entries: Record<string, { name: string; meaning: string }>, keys: readonly string[]) => {
  expect(Object.keys(entries).sort()).toEqual([...keys].sort())
  for (const entry of Object.values(entries)) {
    expect(entry.name.length).toBeGreaterThan(0)
    expect(entry.meaning.length).toBeGreaterThan(20)
  }
}

describe("astrology catalog", () => {
  it("has the 10 planets", () => complete(astrologyCatalog.planets, PLANETS))
  it("has the 12 signs", () => complete(astrologyCatalog.signs, SIGNS))
  it("has the 5 major aspects", () => complete(astrologyCatalog.aspects, ASPECTS.map((a) => a.aspect)))
  it("has the 12 houses", () => complete(astrologyCatalog.houses, Array.from({ length: 12 }, (_, i) => String(i + 1))))

  it("records provenance separately for names and meanings", () => {
    expect(astrologyContentProvenance.names).toMatch(/traditional/i)
    expect(astrologyContentProvenance.meanings).toMatch(/original/i)
  })
})
