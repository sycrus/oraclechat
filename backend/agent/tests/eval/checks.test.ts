import { describe, expect, it } from "vitest"
import { checkReply, checkRightTeller, type ReplyContext } from "../../src/eval/checks.js"
import type { TarotSpread } from "../../src/tarot/draw.js"
import type { IChingReading } from "../../src/iching/cast.js"
import type { AstrologyReading } from "../../src/astrology/chart.js"

const card = (name: string, position: "past" | "present" | "future" | "action" = "present") =>
  ({ position, name, orientation: "upright" as const, artKey: "x", meaning: "m" })
const spread: TarotSpread = { spread: "three-card", cards: [card("The Tower", "past"), card("Three of Cups"), card("Strength", "future")] }
const mira = { id: "mira-the-mystic", displayName: "Mira", discipline: "tarot" }
const sage = { id: "sage-the-seer", displayName: "Sage", discipline: "i-ching" }
const astra = { id: "astra-the-astrologer", displayName: "Astra", discipline: "astrology" }

const tarot = (reply: string, extra: Partial<ReplyContext> = {}): ReplyContext =>
  ({ teller: mira, otherTellerNames: ["Sage"], reply, reading: spread, earlierReadings: [], userText: "Read for me", ...extra })

const iching: IChingReading = {
  method: "i-ching",
  lines: [],
  primary: { number: 5, name: "Xu, Waiting", meaning: "m" },
  relating: { number: 8, name: "Bi, Holding Together", meaning: "m" },
}

const chart = {
  method: "natal-transits",
  computedAt: "2026-11-26T00:00:00Z",
  natal: {
    planets: [
      { point: "sun", sign: "leo", degree: 10, longitude: 130, house: 5, retrograde: false },
      { point: "moon", sign: "pisces", degree: 3, longitude: 333, house: 12, retrograde: false },
    ],
    ascendant: { sign: "aries", degree: 1, longitude: 1 },
    midheaven: { sign: "capricorn", degree: 2, longitude: 272 },
    aspects: [],
  },
  transits: [{ planet: "saturn", aspect: "square", natal: "sun", orb: 1, house: 2 }],
} as unknown as AstrologyReading

describe("draw use and invented items", () => {
  it("passes a tarot reply that interprets a dealt card", () => {
    const result = checkReply(tarot("The Tower in your past cleared the ground; the Three of Cups says lean on friends."))
    expect(result.usedDraw).toBe(true)
    expect(result.invented).toEqual([])
  })

  it("matches majors after a lowercase article", () => {
    expect(checkReply(tarot("I see the Tower behind you.")).usedDraw).toBe(true)
  })

  it("flags a tarot reply that names an undealt card", () => {
    const result = checkReply(tarot("The Tower, then the Ace of Wands for a fresh start, and The Star."))
    expect(result.invented).toEqual(["Ace of Wands", "The Star"])
  })

  it("flags a reading reply that names none of the dealt cards", () => {
    expect(checkReply(tarot("Big changes ahead, be brave.")).usedDraw).toBe(false)
  })

  it("allows cards from an earlier reading or the user's message in a no-reading reply", () => {
    const result = checkReply(tarot("That Tower is still with you, and yes, the Ace of Pentacles you mentioned fits.", {
      reading: undefined, earlierReadings: [spread], userText: "What about the Ace of Pentacles?",
    }))
    expect(result.usedDraw).toBeNull()
    expect(result.invented).toEqual([])
  })

  it("flags a card made up in a no-reading reply", () => {
    expect(checkReply(tarot("I'm getting The Moon energy from you.", { reading: undefined })).invented).toEqual(["The Moon"])
  })

  it("counts a hexagram number, pinyin or gloss as use, and flags another hexagram", () => {
    const base = { teller: sage, otherTellerNames: [], reading: iching, earlierReadings: [], userText: "Cast for me" }
    expect(checkReply({ ...base, reply: "Hexagram 5 asks you to wait." }).usedDraw).toBe(true)
    expect(checkReply({ ...base, reply: "Xu is the hexagram of patience." }).usedDraw).toBe(true)
    expect(checkReply({ ...base, reply: "This is Waiting, moving toward Holding Together." }).usedDraw).toBe(true)
    expect(checkReply({ ...base, reply: "Hexagram 5, then hexagram 12 later." }).invented).toEqual(["Hexagram 12"])
    expect(checkReply({ ...base, reply: "Patience." }).usedDraw).toBe(false)
  })

  it("checks astrology placements against the chart", () => {
    const base = { teller: astra, otherTellerNames: [], reading: chart, earlierReadings: [], userText: "Look at my chart" }
    expect(checkReply({ ...base, reply: "With your Sun in Leo you want to be seen." }).usedDraw).toBe(true)
    expect(checkReply({ ...base, reply: "Saturn is squaring your Sun right now." }).usedDraw).toBe(true)
    const wrong = checkReply({ ...base, reply: "Your Sun in Virgo and Moon in Pisces." })
    expect(wrong.invented).toEqual(["Sun in Virgo"])
    expect(checkReply({ ...base, reply: "Be kind to yourself." }).usedDraw).toBe(false)
  })
})

describe("character", () => {
  it("flags AI talk, 'the user' and speaking as another teller", () => {
    expect(checkReply(tarot("The Tower. As an AI, I can't predict the future.")).character).toEqual(["ai-talk"])
    expect(checkReply(tarot("The Tower tells the user to rest.")).character).toEqual(["the-user"])
    expect(checkReply(tarot("The Tower.\nSage: I agree with Mira.")).character).toEqual(["speaks-as-other"])
  })

  it("passes a plain in-voice reply", () => {
    expect(checkReply(tarot("The Tower? Renovation energy. Go water the lemon balm.")).character).toEqual([])
  })
})

describe("right teller in pairs", () => {
  it("passes when exactly the expected tellers read", () => {
    expect(checkRightTeller(["mira-the-mystic"], { "mira-the-mystic": true, "sage-the-seer": false })).toBe(true)
  })

  it("fails when the other teller also reads or the expected one doesn't", () => {
    expect(checkRightTeller(["mira-the-mystic"], { "mira-the-mystic": true, "sage-the-seer": true })).toBe(false)
    expect(checkRightTeller(["mira-the-mystic"], { "mira-the-mystic": false, "sage-the-seer": false })).toBe(false)
  })
})
