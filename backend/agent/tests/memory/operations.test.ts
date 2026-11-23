import { describe, expect, it } from "vitest"
import { validateMemoryOperations } from "../../src/memory/extractor.js"

describe("memory operation validation", () => {
  const context = { existingIds: ["m1"], tellers: [{ id: "mira-the-mystic", name: "Mira" }], knownTellerIds: ["mira-the-mystic", "sage-the-seer"] }

  it("accepts adds and updates, normalising entities", () => {
    expect(validateMemoryOperations(JSON.stringify([
      { op: "add", content: " Has a sister named Ana ", kind: "detail", entities: [" Ana ", "ANA"] },
      { op: "update", id: "m1", content: "Moved to Osaka", kind: "core", entities: [] },
    ]), context)).toEqual([
      { op: "add", content: "Has a sister named Ana", kind: "detail", entities: ["ana"] },
      { op: "update", id: "m1", content: "Moved to Osaka", kind: "core", entities: [] },
    ])
  })

  it("reads the first JSON array when the model adds text around it, and defaults kind and entities", () => {
    expect(validateMemoryOperations('Here you go: [{"op":"add","content":"Likes tea"}] done', context))
      .toEqual([{ op: "add", content: "Likes tea", kind: "detail", entities: [] }])
  })

  it("drops updates to unknown memories and tags for tellers not in the conversation", () => {
    expect(validateMemoryOperations(JSON.stringify([
      { op: "update", id: "nope", content: "x is y", kind: "detail", entities: [] },
      { op: "add", content: "Told Sage about the move", kind: "detail", entities: ["sage-the-seer", "osaka"] },
    ]), context)).toEqual([
      { op: "add", content: "Told Sage about the move", kind: "detail", entities: ["osaka"] },
    ])
  })

  it("drops single-word junk content", () => {
    expect(validateMemoryOperations(JSON.stringify([{ op: "add", content: "Idteller" }, { op: "add", content: "Likes green tea" }]), context))
      .toEqual([{ op: "add", content: "Likes green tea", kind: "detail", entities: [] }])
  })

  it("maps a teller's display name to its id", () => {
    expect(validateMemoryOperations(JSON.stringify([{ op: "add", content: "Will send the application to Mira", entities: ["Mira"] }]), context))
      .toEqual([{ op: "add", content: "Will send the application to Mira", kind: "detail", entities: ["mira-the-mystic"] }])
  })

  it("parses the first complete array even when a later bracket is malformed", () => {
    const response = '[{"op":"add","content":"Likes tea","entities":[]}] (see [note])'
    expect(validateMemoryOperations(response, context)).toEqual([{ op: "add", content: "Likes tea", kind: "detail", entities: [] }])
  })

  it("rejects more than 8 operations and caps entities at 6", () => {
    const many = Array.from({ length: 9 }, (_, index) => ({ op: "add", content: `Fact number ${index}` }))
    expect(() => validateMemoryOperations(JSON.stringify(many), context)).toThrow()
    const [op] = validateMemoryOperations(JSON.stringify([{ op: "add", content: "Many names here", entities: ["a", "b", "c", "d", "e", "f", "g"] }]), context)
    expect(op!.entities).toHaveLength(6)
  })
})
