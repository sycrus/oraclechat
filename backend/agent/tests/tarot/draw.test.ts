import { describe, expect, it } from "vitest"
import { drawSignatureCards, drawSpread } from "../../src/tarot/draw.js"
import { getTarotCardContent } from "../../src/tarot/catalog.js"

describe("app-owned tarot draw", () => {
  it("draws one distinct card with the single-card position", () => {
    const spread = drawSpread("one-card", () => 0)
    expect(spread.cards).toHaveLength(1)
    expect(spread.cards[0]?.position).toBe("guidance")
    expect(["upright", "reversed"]).toContain(spread.cards[0]?.orientation)
    expect(spread.cards[0]?.meaning.toLowerCase()).not.toContain("placeholder")
    expect(spread.cards[0]?.artKey).toBeTruthy()
  })

  it("draws three distinct cards into fixed past, present, future positions", () => {
    const spread = drawSpread("three-card", () => 0.25)
    expect(spread.cards.map((card) => card.position)).toEqual(["past", "present", "future"])
    expect(new Set(spread.cards.map((card) => card.name)).size).toBe(3)
    expect(spread.cards.every((card) => ["upright", "reversed"].includes(card.orientation))).toBe(true)
  })

  it("draws ten distinct cards into the fixed Celtic Cross positions", () => {
    const spread = drawSpread("celtic-cross", () => 0.25)
    expect(spread.spread).toBe("celtic-cross")
    expect(spread.cards.map((card) => card.position)).toEqual([
      "heart", "challenge", "foundation", "recent-past", "conscious",
      "near-future", "self", "environment", "hopes-fears", "outcome",
    ])
    expect(new Set(spread.cards.map((card) => card.name)).size).toBe(10)
    expect(spread.cards.every((card) => ["upright", "reversed"].includes(card.orientation))).toBe(true)
  })

  it("keeps signature cards distinct from all ten Celtic Cross cards", () => {
    for (const seed of [0, 0.5, 0.99]) {
      const spread = drawSpread("celtic-cross", () => seed)
      const signature = drawSignatureCards(spread, ["action", "shadow"], () => seed)
      expect(new Set([...spread.cards, ...signature].map((card) => card.name)).size).toBe(12)
    }
  })

  it("defaults to a three-card spread", () => {
    expect(drawSpread(undefined, () => 0).cards).toHaveLength(3)
  })

  it("uses the interpretation matching each card's drawn orientation", () => {
    const upright = drawSpread("one-card", () => 0.99).cards[0]!
    const reversed = drawSpread("one-card", () => 0).cards[0]!
    expect(upright.orientation).toBe("reversed")
    expect(upright.meaning).toBe(getTarotCardContent(upright.name).reversed)
    expect(reversed.orientation).toBe("upright")
    expect(reversed.meaning).toBe(getTarotCardContent(reversed.name).upright)
  })

  it("draws one signature card per position, distinct from the spread and each other", () => {
    for (const seed of [0, 0.25, 0.5, 0.99]) {
      const spread = drawSpread("three-card", () => seed)
      const signature = drawSignatureCards(spread, ["action", "shadow"], () => seed)
      expect(signature.map((card) => card.position)).toEqual(["action", "shadow"])
      const names = [...spread.cards, ...signature].map((card) => card.name)
      expect(new Set(names).size).toBe(5)
      for (const card of signature) {
        expect(card.meaning).toBe(getTarotCardContent(card.name)[card.orientation])
        expect(card.artKey).toBe(getTarotCardContent(card.name).artKey)
      }
    }
  })
})
