import { describe, expect, it } from "vitest"
import { dealFan, drawFan, type FanInteraction } from "../../src/tarot/fan.js"
import { drawSpread } from "../../src/tarot/draw.js"
import { publicInteraction } from "../../src/chat/interaction.js"

describe("laying out a fan", () => {
  it("holds the spread's positions plus six distinct cards, each with an orientation", () => {
    for (const [spread, size] of [["one-card", 7], ["three-card", 9], ["celtic-cross", 16]] as const) {
      const fan = drawFan(spread, () => 0.3)
      expect(fan.kind).toBe("card-fan")
      expect(fan.state).toBe("open")
      expect(fan.spread).toBe(spread)
      expect(fan.size).toBe(size)
      expect(fan.picks).toEqual([])
      expect(fan.hidden).toHaveLength(size)
      expect(new Set(fan.hidden!.map((card) => card.name)).size).toBe(size)
      expect(fan.hidden!.every((card) => ["upright", "reversed"].includes(card.orientation))).toBe(true)
    }
  })

  it("shuffles with the supplied random source", () => {
    const first = drawFan("three-card", () => 0.1).hidden!.map((card) => card.name)
    const second = drawFan("three-card", () => 0.9).hidden!.map((card) => card.name)
    expect(first).not.toEqual(second)
  })
})

describe("dealing the picks", () => {
  const open = (): FanInteraction => ({ ...drawFan("three-card", () => 0.3), picks: [4, 0, 7] })

  it("puts the picks, in pick order, into the fixed positions with their stored orientations", () => {
    const fan = open()
    const { reading } = dealFan(fan, undefined)
    expect(reading.spread).toBe("three-card")
    expect(reading.cards.map((card) => card.position)).toEqual(["past", "present", "future"])
    expect(reading.cards.map((card) => card.name)).toEqual([4, 0, 7].map((index) => fan.hidden![index]!.name))
    expect(reading.cards.map((card) => card.orientation)).toEqual([4, 0, 7].map((index) => fan.hidden![index]!.orientation))
  })

  it("adds a signature card distinct from the dealt cards", () => {
    const { reading, card } = dealFan(open(), "action")
    expect(card?.position).toBe("action")
    expect(reading.cards.map((dealt) => dealt.name)).not.toContain(card!.name)
  })

  it("draws no signature card when the teller has none", () => {
    expect(dealFan(open(), undefined).card).toBeUndefined()
  })

  it("refuses to deal with the wrong number of picks", () => {
    expect(() => dealFan({ ...open(), picks: [1, 2] }, undefined)).toThrow()
  })

  it("matches the shape of an ordinary drawn spread", () => {
    const dealt = dealFan(open(), undefined).reading
    expect(Object.keys(dealt.cards[0]!).sort()).toEqual(Object.keys(drawSpread("one-card", () => 0).cards[0]!).sort())
  })
})

describe("public view of an interaction", () => {
  it("removes the hidden cards and keeps everything else", () => {
    const fan: FanInteraction = { ...drawFan("three-card", () => 0.3), picks: [2, 5] }
    const view = publicInteraction(fan)!
    expect(view).not.toHaveProperty("hidden")
    expect(view).toEqual({ kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [2, 5] })
    expect(JSON.stringify(view)).not.toContain(fan.hidden![0]!.name)
  })

  it("returns nothing for a message without an interaction", () => {
    expect(publicInteraction(undefined)).toBeUndefined()
  })
})
