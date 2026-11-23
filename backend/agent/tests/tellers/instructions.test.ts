import { beforeEach, describe, expect, it } from "vitest"
import { TellerRegistry } from "../../src/tellers/registry.js"
import { buildTellerInstructions } from "../../src/tellers/instructions.js"

describe("buildTellerInstructions", () => {
  let registry: TellerRegistry

  beforeEach(async () => {
    registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
  })

  it("sends the teller's persona, life context, lens and relationship to the model", () => {
    const sage = registry.get("sage-the-seer")!
    const instructions = buildTellerInstructions(sage, registry)

    expect(instructions).toContain(sage.systemPrompt.trim())
    for (const field of Object.values(sage.personality)) expect(instructions).toContain(field)
    for (const detail of sage.lifeContext ?? []) expect(instructions).toContain(detail)
    expect(instructions).toContain(sage.readingLens.trim())
    expect(instructions).not.toContain("signature card")
    expect(instructions).toContain("rapport with Mira")
    expect(instructions).toContain("do not speak for another teller")
  })

  it("keeps life details occasional and each teller's details their own", () => {
    const sage = buildTellerInstructions(registry.get("sage-the-seer")!, registry)
    expect(sage).toContain("Do not open a reply with a life detail")
    expect(sage).toContain("Never mention another teller's pets, home or habits as your own")
  })

  it("asks every teller for short, chat-style replies", () => {
    for (const teller of registry.list()) {
      const instructions = buildTellerInstructions(teller, registry)
      expect(instructions).toContain("Reply style: this is a chat, not an essay.")
      expect(instructions).toContain("No headings, no bullet lists")
    }
  })

  it("gives each teller different instructions", () => {
    const mira = buildTellerInstructions(registry.get("mira-the-mystic")!, registry)
    const sage = buildTellerInstructions(registry.get("sage-the-seer")!, registry)
    expect(mira).toContain("action card")
    expect(mira).toContain(registry.get("mira-the-mystic")!.readingLens.trim())
    expect(sage).not.toContain("action card")
    expect(sage).not.toContain(mira)
  })
})
