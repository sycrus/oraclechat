import { describe, it, expect } from "vitest"
import { tellerDefinitionSchema, type TellerDefinition, DISCIPLINES } from "../../src/tellers/schema.js"

const validTeller: TellerDefinition = {
  id: "mira-the-mystic",
  displayName: "Mira",
  avatar: "/tellers/mira.png",
  discipline: "tarot",
  gender: "female",
  personality: {
    voice: "Warm but sharp — like a friend who tells you what you need to hear",
    humor: "Dry observations disguised as mystic pronouncements",
    emotionalRegister: "Empathetic but not coddling",
    reframingStyle: "Finds the hidden opportunity in setbacks",
  },
  activationProfile: {
    topics: ["career", "ambition", "life-direction", "big-decisions"],
    emotionalTones: ["frustrated", "determined", "restless"],
    situations: ["facing-a-crossroads", "considering-a-change", "feeling-stuck"],
  },
  readingLens: "Read the spread for the next concrete step.",
  signatureCard: { position: "action" },
  systemPrompt: "You are Mira, a tarot reader who offers grounded, constructive readings.",
}

describe("tellerDefinitionSchema", () => {
  it("validates a complete, well-formed teller definition", () => {
    const result = tellerDefinitionSchema.safeParse(validTeller)
    expect(result.success).toBe(true)
  })

  it("rejects a definition missing a required field (discipline)", () => {
    const { discipline, ...withoutDiscipline } = validTeller
    const result = tellerDefinitionSchema.safeParse(withoutDiscipline)
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path.join("."))
      expect(fields).toContain("discipline")
    }
  })

  it("rejects a tarot teller without a signature card", () => {
    const { signatureCard, ...withoutSignature } = validTeller
    const result = tellerDefinitionSchema.safeParse(withoutSignature)
    expect(result.success).toBe(false)
  })

  it("rejects an unknown signature card position", () => {
    const result = tellerDefinitionSchema.safeParse({ ...validTeller, signatureCard: { position: "omen" } })
    expect(result.success).toBe(false)
  })

  it("rejects a definition without a reading lens", () => {
    const { readingLens, ...withoutLens } = validTeller
    const result = tellerDefinitionSchema.safeParse(withoutLens)
    expect(result.success).toBe(false)
  })

  it("accepts an I Ching teller without a signature card", () => {
    const { signatureCard, ...rest } = validTeller
    const result = tellerDefinitionSchema.safeParse({ ...rest, discipline: "i-ching" })
    expect(result.success).toBe(true)
  })

  it("rejects a non-tarot teller with a signature card", () => {
    const result = tellerDefinitionSchema.safeParse({ ...validTeller, discipline: "i-ching" })
    expect(result.success).toBe(false)
  })

  it("rejects a definition missing displayName", () => {
    const { displayName, ...withoutName } = validTeller
    const result = tellerDefinitionSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path.join("."))
      expect(fields).toContain("displayName")
    }
  })

  it("rejects an invalid discipline value", () => {
    const result = tellerDefinitionSchema.safeParse({
      ...validTeller,
      discipline: "crystal-gazing",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("discipline"))
      expect(issue).toBeDefined()
    }
  })

  it("rejects an invalid gender value", () => {
    const result = tellerDefinitionSchema.safeParse({
      ...validTeller,
      gender: "other",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("gender"))
      expect(issue).toBeDefined()
    }
  })

  it("accepts a definition with optional fields omitted (lifeContext, relationships)", () => {
    const result = tellerDefinitionSchema.safeParse(validTeller)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lifeContext).toBeUndefined()
      expect(result.data.relationships).toBeUndefined()
    }
  })

  it("accepts a definition with lifeContext provided", () => {
    const result = tellerDefinitionSchema.safeParse({
      ...validTeller,
      lifeContext: ["Keeps a herb garden", "Complains about her neighbor's wind chimes"],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lifeContext).toEqual([
        "Keeps a herb garden",
        "Complains about her neighbor's wind chimes",
      ])
    }
  })

  it("accepts a definition with relationships provided", () => {
    const result = tellerDefinitionSchema.safeParse({
      ...validTeller,
      relationships: [
        { targetTellerId: "sage-the-seer", type: "rapport" },
        { targetTellerId: "bram-the-bold", type: "friction" },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.relationships).toEqual([
        { targetTellerId: "sage-the-seer", type: "rapport" },
        { targetTellerId: "bram-the-bold", type: "friction" },
      ])
    }
  })

  it("rejects an invalid relationship type", () => {
    const result = tellerDefinitionSchema.safeParse({
      ...validTeller,
      relationships: [{ targetTellerId: "sage-the-seer", type: "arch-nemesis" }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.some((p) => p === "type")
      )
      expect(issue).toBeDefined()
    }
  })
})

describe("DISCIPLINES constant", () => {
  it("contains all expected disciplines", () => {
    expect(DISCIPLINES).toEqual([
      "tarot",
      "i-ching",
      "astrology",
      "rune-casting",
      "numerology",
      "palmistry",
      "tea-leaves",
      "stoic-counsel",
    ])
  })
})

describe("call configuration", () => {
  it("accepts a teller without a call section", () => {
    expect(tellerDefinitionSchema.safeParse(validTeller).success).toBe(true)
  })

  it("accepts a call section with a voice name", () => {
    const result = tellerDefinitionSchema.safeParse({ ...validTeller, call: { voice: "mira" } })
    expect(result.success).toBe(true)
  })

  it("rejects a call section without a voice", () => {
    const result = tellerDefinitionSchema.safeParse({ ...validTeller, call: {} })
    expect(result.success).toBe(false)
  })

  it("rejects a voice name that could be a path", () => {
    const result = tellerDefinitionSchema.safeParse({ ...validTeller, call: { voice: "../mira" } })
    expect(result.success).toBe(false)
  })
})

describe("card fan", () => {
  it("accepts a fan with an invitation on a tarot teller", () => {
    expect(tellerDefinitionSchema.safeParse({ ...validTeller, fan: { invitation: "Pick the cards that call to you." } }).success).toBe(true)
  })

  it("rejects a fan with an empty invitation", () => {
    expect(tellerDefinitionSchema.safeParse({ ...validTeller, fan: { invitation: "" } }).success).toBe(false)
  })

  it("rejects a fan on a non-tarot teller", () => {
    const { signatureCard: _signature, ...rest } = validTeller
    const result = tellerDefinitionSchema.safeParse({ ...rest, discipline: "i-ching", fan: { invitation: "Pick." } })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join("."))).toContain("fan")
  })
})

describe("coin toss", () => {
  function ichingTeller(extra: Record<string, unknown> = {}) {
    const { signatureCard: _signature, fan: _fan, ...rest } = validTeller
    return { ...rest, discipline: "i-ching", ...extra }
  }

  it("accepts a toss with an invitation on an I Ching teller", () => {
    expect(tellerDefinitionSchema.safeParse(ichingTeller({ toss: { invitation: "Toss the coins, one line at a time." } })).success).toBe(true)
  })

  it("rejects a toss with an empty invitation", () => {
    expect(tellerDefinitionSchema.safeParse(ichingTeller({ toss: { invitation: "" } })).success).toBe(false)
  })

  it("rejects a toss on a non-I-Ching teller", () => {
    const result = tellerDefinitionSchema.safeParse({ ...validTeller, toss: { invitation: "Toss." } })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join("."))).toContain("toss")
  })
})

describe("birth-details invitation", () => {
  const { signatureCard: _signature, ...withoutSignature } = validTeller
  const astrologyTeller = (extra: Record<string, unknown> = {}) => ({ ...withoutSignature, discipline: "astrology", ...extra })
  const invitation = { birthDetails: { invitation: "Tell me when and where you were born, and I'll read your sky." } }

  it("accepts an astrology teller with an invitation", () => {
    expect(tellerDefinitionSchema.safeParse(astrologyTeller(invitation)).success).toBe(true)
  })

  it("rejects an astrology teller without one", () => {
    const result = tellerDefinitionSchema.safeParse(astrologyTeller())
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join("."))).toContain("birthDetails")
  })

  it("rejects an empty invitation", () => {
    expect(tellerDefinitionSchema.safeParse(astrologyTeller({ birthDetails: { invitation: "" } })).success).toBe(false)
  })

  it("rejects it on tarot and I Ching tellers", () => {
    expect(tellerDefinitionSchema.safeParse({ ...validTeller, ...invitation }).success).toBe(false)
    expect(tellerDefinitionSchema.safeParse({ ...withoutSignature, discipline: "i-ching", ...invitation }).success).toBe(false)
  })
})
