import { describe, expect, it } from "vitest"
import { CALL_PALETTE } from "./call/palette"
import { pixelTarot } from "./pixel-tarot"

const SUITS = ["wands", "cups", "swords", "pentacles"]
const RANKS = ["ace", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "page", "knight", "queen", "king"]
const KEYS = [...Array.from({ length: 22 }, (_, index) => `major-${index}`), ...SUITS.flatMap((suit) => RANKS.map((rank) => `${suit}-${rank}`))]

describe("pixel tarot cards", () => {
  it("draws all 78 cards on a 24×36 grid in call palette colours", () => {
    expect(KEYS).toHaveLength(78)
    for (const key of KEYS) {
      const art = pixelTarot(key)
      expect(art.rows).toHaveLength(36)
      for (const row of art.rows) expect(row).toHaveLength(24)
      for (const code of new Set(art.rows.join("").replace(/\./g, ""))) expect(CALL_PALETTE).toContain(art.colours[code])
    }
  })

  it("gives every card its own picture", () => {
    expect(new Set(KEYS.map((key) => pixelTarot(key).rows.join("|"))).size).toBe(78)
  })

  it("draws as many suit symbols as a number card's rank", () => {
    const pentacles = (rank: string) => pixelTarot(`pentacles-${rank}`).rows.join("").split("a").length
    expect(pentacles("three")).toBeGreaterThan(pentacles("two"))
    expect(pentacles("ten")).toBeGreaterThan(pentacles("nine"))
  })

  it("falls back to a plain card back for an unknown key", () => {
    expect(pixelTarot("unknown-card").rows).toHaveLength(36)
  })
})
