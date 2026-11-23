import { describe, expect, it } from "vitest"
import { parseSignatureCard, parseTarotSpread } from "./tarot"

describe("tarot spread validation", () => {
  const valid = {
    spread: "three-card",
    cards: ["past", "present", "future"].map((position, index) => ({
      position, name: `Card ${position}`, orientation: "upright", artKey: `major-${index}`, meaning: "A reflection.",
    })),
  }

  it("accepts a complete three-card spread", () => {
    expect(parseTarotSpread(valid)).toEqual(valid)
  })

  it("rejects an unsupported spread, missing cards, and invalid orientation", () => {
    expect(parseTarotSpread({ ...valid, spread: "twenty-card" })).toBeNull()
    expect(parseTarotSpread({ spread: "three-card" })).toBeNull()
    expect(parseTarotSpread({ ...valid, cards: valid.cards.map((card, index) => index ? card : { ...card, orientation: "sideways" }) })).toBeNull()
  })

  it("rejects cards with a wrong fixed position or duplicate name", () => {
    expect(parseTarotSpread({ ...valid, cards: valid.cards.map((card, index) => index ? card : { ...card, position: "future" }) })).toBeNull()
    expect(parseTarotSpread({ ...valid, cards: valid.cards.map((card) => ({ ...card, name: "The Fool" })) })).toBeNull()
  })

  const celticPositions = ["heart", "challenge", "foundation", "recent-past", "conscious", "near-future", "self", "environment", "hopes-fears", "outcome"]
  const celtic = {
    spread: "celtic-cross",
    cards: celticPositions.map((position, index) => ({
      position, name: `Card ${index}`, orientation: "reversed", artKey: `major-${index}`, meaning: "A reflection.",
    })),
  }

  it("accepts a complete Celtic Cross", () => {
    expect(parseTarotSpread(celtic)).toEqual(celtic)
  })

  it("rejects a Celtic Cross with the wrong count, order or a duplicate card", () => {
    expect(parseTarotSpread({ ...celtic, cards: celtic.cards.slice(0, 9) })).toBeNull()
    expect(parseTarotSpread({ ...celtic, cards: [celtic.cards[1], celtic.cards[0], ...celtic.cards.slice(2)] })).toBeNull()
    expect(parseTarotSpread({ ...celtic, cards: celtic.cards.map((card) => ({ ...card, name: "The Fool" })) })).toBeNull()
  })

  it("rejects unknown illustration keys", () => {
    expect(parseTarotSpread({ ...valid, cards: valid.cards.map((card, index) => index ? card : { ...card, artKey: "external-image.svg" }) })).toBeNull()
  })

  it("rejects a repeated illustration key", () => {
    expect(parseTarotSpread({ ...valid, cards: valid.cards.map((card) => ({ ...card, artKey: "major-0" })) })).toBeNull()
  })
})

describe("parseSignatureCard", () => {
  const card = { position: "shadow", name: "The Moon", orientation: "reversed", artKey: "major-18", meaning: "Something is surfacing." }

  it("accepts an action or shadow card", () => {
    expect(parseSignatureCard(card)).toEqual(card)
    expect(parseSignatureCard({ ...card, position: "action" })?.position).toBe("action")
  })

  it("rejects malformed or spread-position cards", () => {
    expect(parseSignatureCard(undefined)).toBeNull()
    expect(parseSignatureCard({ ...card, position: "past" })).toBeNull()
    expect(parseSignatureCard({ ...card, orientation: "sideways" })).toBeNull()
    expect(parseSignatureCard({ ...card, artKey: "../evil" })).toBeNull()
    expect(parseSignatureCard({ ...card, meaning: " " })).toBeNull()
  })
})
