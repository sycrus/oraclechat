import { describe, it, expect, beforeEach } from "vitest"
import { TellerRegistry } from "../../src/tellers/registry.js"

describe("Teller definitions directory", () => {
  let registry: TellerRegistry

  beforeEach(async () => {
    registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
  })

  it("loads mira.yaml successfully", () => {
    const mira = registry.get("mira-the-mystic")
    expect(mira).toBeDefined()
  })

  it("mira has the correct discipline", () => {
    const mira = registry.get("mira-the-mystic")!
    expect(mira.discipline).toBe("tarot")
  })

  it("mira has the correct gender", () => {
    const mira = registry.get("mira-the-mystic")!
    expect(mira.gender).toBe("female")
  })

  it("mira has life context", () => {
    const mira = registry.get("mira-the-mystic")!
    expect(mira.lifeContext).toBeDefined()
    expect(mira.lifeContext!.length).toBeGreaterThan(0)
  })

  it("mira has relationships defined", () => {
    const mira = registry.get("mira-the-mystic")!
    expect(mira.relationships).toBeDefined()
    expect(mira.relationships!.length).toBeGreaterThan(0)
  })

  it("mira has an activation profile with topics", () => {
    const mira = registry.get("mira-the-mystic")!
    expect(mira.activationProfile.topics).toContain("career")
  })

  it("mira has a non-empty system prompt", () => {
    const mira = registry.get("mira-the-mystic")!
    expect(mira.systemPrompt.length).toBeGreaterThan(100)
  })

  it("gives Mira the action card and Sage no signature card", () => {
    expect(registry.get("mira-the-mystic")!.signatureCard?.position).toBe("action")
    expect(registry.get("sage-the-seer")!.signatureCard).toBeUndefined()
    expect(registry.get("mira-the-mystic")!.fan?.invitation).toBeTruthy()
    expect(registry.get("sage-the-seer")!.fan).toBeUndefined()
    expect(registry.get("mira-the-mystic")!.readingLens.length).toBeGreaterThan(40)
    expect(registry.get("sage-the-seer")!.readingLens.length).toBeGreaterThan(40)
  })

  it("loads Mira as the tarot teller, Sage as the I Ching teller and Astra as the astrology teller", () => {
    expect(registry.list().map((teller) => teller.id).sort()).toEqual([
      "astra-the-astrologer",
      "mira-the-mystic",
      "sage-the-seer",
    ])
    expect(registry.get("mira-the-mystic")!.discipline).toBe("tarot")
    expect(registry.get("sage-the-seer")!.discipline).toBe("i-ching")
    expect(registry.get("astra-the-astrologer")!.discipline).toBe("astrology")
  })

  it("defines Astra as a timing-and-cycles astrologer with a birth-details invitation", () => {
    const astra = registry.get("astra-the-astrologer")!
    expect(astra.gender).toBe("female")
    expect(astra.signatureCard).toBeUndefined()
    expect(astra.birthDetails?.invitation).toBeTruthy()
    expect(astra.readingLens).toMatch(/transit/i)
    expect(astra.systemPrompt).toMatch(/never compute|application computes/i)
    expect(astra.relationships?.map((relationship) => relationship.targetTellerId).sort()).toEqual(["mira-the-mystic", "sage-the-seer"])
  })

  it("defines Sage as a reflective I Ching counterpart", () => {
    const sage = registry.get("sage-the-seer")!
    expect(sage.discipline).toBe("i-ching")
    expect(sage.systemPrompt).toMatch(/I Ching/)
    expect(sage.personality.voice.toLowerCase()).toContain("reflective")
    expect(sage.systemPrompt.length).toBeGreaterThan(100)
  })
})

describe("Teller call configuration", () => {
  it("Mira, Sage and Astra can each be called with their own voice", async () => {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    expect(registry.get("mira-the-mystic")!.call).toEqual({ voice: "mira" })
    expect(registry.get("sage-the-seer")!.call).toEqual({ voice: "sage" })
    expect(registry.get("astra-the-astrologer")!.call).toEqual({ voice: "astra" })
  })
})
