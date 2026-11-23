import { describe, it, expect, beforeEach } from "vitest"
import { TellerRegistry } from "../../src/tellers/registry.js"
import type { TellerDefinition } from "../../src/tellers/schema.js"

const mira: TellerDefinition = {
  id: "mira-the-mystic",
  displayName: "Mira",
  avatar: "/tellers/mira.png",
  discipline: "tarot",
  gender: "female",
  personality: {
    voice: "Warm but sharp",
    humor: "Dry observations",
    emotionalRegister: "Empathetic but not coddling",
    reframingStyle: "Finds the hidden opportunity",
  },
  activationProfile: {
    topics: ["career"],
    emotionalTones: ["frustrated"],
    situations: ["facing-a-crossroads"],
  },
  readingLens: "Next step.",
  signatureCard: { position: "action" },
  systemPrompt: "You are Mira, a tarot reader.",
}

const sage: TellerDefinition = {
  id: "sage-the-seer",
  displayName: "Sage",
  avatar: "/tellers/sage.png",
  discipline: "i-ching",
  gender: "non-binary",
  personality: {
    voice: "Calm and measured",
    humor: "Subtle irony",
    emotionalRegister: "Steady presence",
    reframingStyle: "Zooms out to the big picture",
  },
  activationProfile: {
    topics: ["relationships"],
    emotionalTones: ["anxious"],
    situations: ["conflict"],
  },
  readingLens: "Beneath the surface.",
  systemPrompt: "You are Sage, an i-ching reader.",
}

describe("TellerRegistry", () => {
  let registry: TellerRegistry

  beforeEach(() => {
    registry = new TellerRegistry()
  })

  describe("register", () => {
    it("registers a valid teller and makes it queryable", () => {
      registry.register(mira)
      expect(registry.get("mira-the-mystic")).toEqual(mira)
    })

    it("rejects a duplicate ID", () => {
      registry.register(mira)
      expect(() => registry.register(mira)).toThrow(/duplicate/i)
    })

    it("rejects an invalid teller definition", () => {
      const invalid = { ...mira, discipline: undefined }
      expect(() => registry.register(invalid as unknown as TellerDefinition)).toThrow()
    })

    it("allows registering multiple different tellers", () => {
      registry.register(mira)
      registry.register(sage)
      expect(registry.get("mira-the-mystic")).toEqual(mira)
      expect(registry.get("sage-the-seer")).toEqual(sage)
    })
  })

  describe("get", () => {
    it("returns undefined for an unknown teller ID", () => {
      expect(registry.get("nonexistent")).toBeUndefined()
    })
  })

  describe("list", () => {
    it("returns an empty array when no tellers are registered", () => {
      expect(registry.list()).toEqual([])
    })

    it("returns all registered tellers", () => {
      registry.register(mira)
      registry.register(sage)
      const tellers = registry.list()
      expect(tellers).toHaveLength(2)
      expect(tellers.map((t) => t.id)).toContain("mira-the-mystic")
      expect(tellers.map((t) => t.id)).toContain("sage-the-seer")
    })
  })

  describe("loadFromDirectory", () => {
    it("loads valid YAML teller definitions from a directory", async () => {
      await registry.loadFromDirectory("tests/tellers/fixtures/valid")
      expect(registry.get("mira-the-mystic")).toBeDefined()
      expect(registry.get("mira-the-mystic")!.displayName).toBe("Mira")
    })

    it("skips invalid definitions and logs the error", async () => {
      await registry.loadFromDirectory("tests/tellers/fixtures/mixed")
      // Only the valid file should load
      expect(registry.get("mira-the-mystic")).toBeDefined()
      // The invalid file should be skipped, not crash
      expect(registry.list()).toHaveLength(1)
    })

    it("handles an empty directory gracefully", async () => {
      await registry.loadFromDirectory("tests/tellers/fixtures/empty")
      expect(registry.list()).toEqual([])
    })

    it("handles a directory that does not exist", async () => {
      await registry.loadFromDirectory("tests/tellers/fixtures/nonexistent")
      expect(registry.list()).toEqual([])
    })
  })
})
