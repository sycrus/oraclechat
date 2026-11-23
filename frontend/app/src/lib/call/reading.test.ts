import { describe, expect, it } from "vitest"
import { callPanel, readingDisplay } from "./reading"
import { chartReading } from "../fixtures/chart-reading"

const card = (position: string, name: string, artKey: string, orientation = "upright") => ({ position, name, artKey, orientation, meaning: `${name} meaning` })
const threeCard = {
  spread: "three-card",
  cards: [card("past", "The Fool", "major-0"), card("present", "The Star", "major-17", "reversed"), card("future", "Ace of Cups", "cups-ace")],
}
const action = card("action", "Two of Wands", "wands-two")

describe("readingDisplay", () => {
  it("shows a valid tarot spread as cards", () => {
    const display = readingDisplay("Mira", threeCard, undefined)
    expect("cards" in display && display.cards.spread.cards.map((item) => item.name)).toEqual(["The Fool", "The Star", "Ace of Cups"])
    expect("cards" in display && display.cards.signature).toBeUndefined()
  })

  it("includes the signature card", () => {
    const display = readingDisplay("Mira", { spread: "one-card", cards: [card("guidance", "The Sun", "major-19")] }, action)
    expect("cards" in display && display.cards.signature?.name).toBe("Two of Wands")
  })

  it("falls back to the note for invalid card data", () => {
    expect(readingDisplay("Mira", { spread: "three-card", cards: [] }, undefined)).toEqual({ note: "Mira gave a reading — see chat" })
  })

  it("falls back to the note for a reading the call can't show", () => {
    expect(readingDisplay("Sage", { method: "three-coins", lines: [] }, undefined)).toEqual({ note: "Sage gave a reading — see chat" })
  })

  it("counts the cards when the spread is invalid but has cards", () => {
    expect(readingDisplay("Mira", { spread: "three-card", cards: [{}, {}] }, action)).toEqual({ note: "Mira drew 3 cards — see chat" })
  })
})

describe("callPanel", () => {
  const line = (value: 6 | 7 | 8 | 9) => ({ value, yang: value % 2 === 1, changing: value === 6 || value === 9 })
  const lines = [7, 8, 7, 8, 7, 9].map((value) => line(value as 7 | 8 | 9))
  const iching = { method: "i-ching", lines, primary: { number: 63, name: "Ji Ji, After Completion", meaning: "m" }, relating: { number: 37, name: "Jia Ren, The Family", meaning: "m" } }
  const fan = (state: string, picks: number[] = []) => ({ kind: "card-fan", state, spread: "three-card", size: 9, picks })
  const message = (extra: { interaction?: unknown; reading?: unknown; signatureCard?: unknown; content?: string }) => ({ id: "m1", ...extra })

  it("shows an open fan, a casting toss and an open birth form as they are", () => {
    expect(callPanel("Mira", message({ interaction: fan("open") }))).toMatchObject({ kind: "fan", fan: { state: "open" } })
    expect(callPanel("Sage", message({ interaction: { kind: "coin-toss", state: "casting", lines: [] } }))).toMatchObject({ kind: "toss" })
    expect(callPanel("Astra", message({ interaction: { kind: "birth-details", state: "open" } }))).toEqual({ kind: "form", state: "open" })
  })

  it("shows the result once revealed: cards with the signature card, the I Ching card, the chart", () => {
    expect(callPanel("Mira", message({ interaction: fan("revealed", [0, 1, 2]), reading: threeCard, signatureCard: action }))).toMatchObject({ kind: "cards", cards: { spread: { spread: "three-card" }, signature: { name: "Two of Wands" } } })
    expect(callPanel("Sage", message({ interaction: { kind: "coin-toss", state: "revealed", lines }, reading: iching }))).toMatchObject({ kind: "iching", reading: { primary: { number: 63 } } })
    expect(callPanel("Astra", message({ interaction: { kind: "birth-details", state: "submitted" }, reading: chartReading }))).toMatchObject({ kind: "chart" })
  })

  it("shows readings given at once, and a note for data it can't show", () => {
    expect(callPanel("Astra", message({ reading: chartReading }))).toMatchObject({ kind: "chart" })
    expect(callPanel("Mira", message({ reading: { spread: "three-card", cards: [] } }))).toEqual({ kind: "note", note: "Mira gave a reading — see chat" })
  })

  it("shows nothing for a set-aside interaction or a plain reply", () => {
    expect(callPanel("Mira", message({ interaction: fan("set-aside") }))).toBeNull()
    expect(callPanel("Mira", message({ content: "Hello" }))).toBeNull()
  })
})
