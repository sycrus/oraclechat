import { describe, expect, it } from "vitest"
import { getTarotCardContent, getTarotDeck, tarotContentProvenance } from "../../src/tarot/catalog.js"

describe("original Oracle tarot content", () => {
  it("provides original upright and reversed interpretations for all 78 distinct cards", () => {
    const deck = getTarotDeck()
    expect(deck).toHaveLength(78)
    expect(new Set(deck).size).toBe(78)
    expect(new Set(deck.map((name) => getTarotCardContent(name).artKey)).size).toBe(78)
    for (const name of deck) {
      const content = getTarotCardContent(name)
      expect(content.upright.length).toBeGreaterThan(25)
      expect(content.reversed.length).toBeGreaterThan(25)
      expect(content.upright.toLowerCase()).not.toContain("placeholder")
      expect(content.reversed.toLowerCase()).not.toContain("placeholder")
      expect(content.artKey).toBeTruthy()
    }
  })

  it("records interpretation authorship and card naming provenance", () => {
    expect(tarotContentProvenance.interpretations).toContain("Oracle")
    expect(tarotContentProvenance.interpretations.toLowerCase()).toContain("original")
    expect(tarotContentProvenance.cardNames.toLowerCase()).toContain("traditional")
  })
})
