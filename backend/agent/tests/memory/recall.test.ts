import { newDb } from "pg-mem"
import { beforeEach, describe, expect, it } from "vitest"
import type { Pool } from "pg"
import { MemoryService } from "../../src/memory/service.js"
import { PostgresMemoryStore } from "../../src/memory/store.js"
import { PostgresChatStore } from "../../src/chat/store.js"
import type { Embed } from "../../src/memory/embedder.js"

// Deterministic fake embedder: one dimension per theme keyword.
const themes = [["brother", "sister", "family"], ["job", "work", "career"], ["osaka", "tokyo", "city", "moved"], ["cat", "dog", "pet"]]
const fakeEmbed: Embed = async (texts) => texts.map((text) => {
  const lower = text.toLowerCase()
  return themes.map((words) => (words.some((word) => lower.includes(word)) ? 1 : 0))
})

describe("relevance-filtered memory", () => {
  let store: PostgresMemoryStore
  let memory: MemoryService
  let embedCalls: string[][]

  beforeEach(async () => {
    const database = newDb()
    const { Pool: MemoryPool } = database.adapters.createPg()
    const pool = new MemoryPool() as unknown as Pool
    const chats = new PostgresChatStore(pool)
    await chats.initialize()
    store = new PostgresMemoryStore(pool)
    await store.initialize()
    await chats.createConversation({ id: "c1", title: "Reading", tellerIds: ["mira-the-mystic", "sage-the-seer"] })
    embedCalls = []
    memory = new MemoryService(store, { embed: async (texts) => { embedCalls.push(texts); return fakeEmbed(texts) } })
    await memory.setConsent(true)
  })

  it("stores kind, entities and embedding, but never exposes the embedding", async () => {
    await memory.apply([{ op: "add", content: "Has a brother named Ken", kind: "detail", entities: ["ken"] }], "c1")
    const [stored] = await store.list()
    expect(stored).toMatchObject({ content: "Has a brother named Ken", kind: "detail", entities: ["ken"] })
    expect(stored!.embedding).toEqual([1, 0, 0, 0])
    const [visible] = await memory.list()
    expect(visible).not.toHaveProperty("embedding")
    expect(visible).toMatchObject({ kind: "detail", entities: ["ken"] })
  })

  it("updates an outdated fact instead of adding a duplicate, and re-embeds it", async () => {
    await memory.apply([{ op: "add", content: "Lives in Tokyo", kind: "detail", entities: [] }], "c1")
    const [old] = await memory.list()
    await memory.apply([{ op: "update", id: old!.id, content: "Moved to Osaka", kind: "detail", entities: ["osaka"] }], "c1")
    const all = await store.list()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ id: old!.id, content: "Moved to Osaka", entities: ["osaka"] })
    expect(embedCalls.at(-1)).toEqual(["Moved to Osaka"])
  })

  it("skips adding an exact duplicate", async () => {
    await memory.apply([{ op: "add", content: "Works in design", kind: "detail", entities: [] }], "c1")
    await memory.apply([{ op: "add", content: "works in design", kind: "detail", entities: [] }], "c1")
    expect(await memory.list()).toHaveLength(1)
  })

  it("still saves memories when the embedder fails", async () => {
    memory = new MemoryService(store, { embed: async () => { throw new Error("embedder down") } })
    await memory.apply([{ op: "add", content: "Has a dog named Pip", kind: "detail", entities: ["pip"] }], "c1")
    const [stored] = await store.list()
    expect(stored).toMatchObject({ content: "Has a dog named Pip", embedding: null })
  })

  it("re-embeds on edit and can pin a memory as core", async () => {
    await memory.apply([{ op: "add", content: "Works in design", kind: "detail", entities: [] }], "c1")
    const [saved] = await memory.list()
    await memory.edit(saved!.id, { content: "Works in a new job" })
    expect((await store.list())[0]!.embedding).toEqual([0, 1, 0, 0])
    await memory.edit(saved!.id, { kind: "core" })
    expect((await memory.list())[0]).toMatchObject({ kind: "core", content: "Works in a new job" })
  })

  describe("recall", () => {
    beforeEach(async () => {
      await memory.apply([
        { op: "add", content: "Name is Jo", kind: "core", entities: [] },
        { op: "add", content: "Has a sister named Ana", kind: "detail", entities: ["ana"] },
        { op: "add", content: "Recently changed job to teaching", kind: "detail", entities: [] },
        { op: "add", content: "Promised Mira to send the application this week", kind: "detail", entities: ["mira-the-mystic"] },
        { op: "add", content: "Has a cat named Miso", kind: "detail", entities: ["miso"] },
      ], "c1")
    })

    const contents = (memories: Array<{ content: string }>) => memories.map((entry) => entry.content)

    it("always includes core memories and adds semantic matches above the floor", async () => {
      const recalled = contents(await memory.recall({ message: "I am nervous about my work" }))
      expect(recalled[0]).toBe("Name is Jo")
      expect(recalled).toContain("Recently changed job to teaching")
      expect(recalled).not.toContain("Has a cat named Miso")
    })

    it("ignores weak semantic matches that barely beat the average", async () => {
      memory = new MemoryService(store, { embed: async (texts) => texts.map((text) => (text === "Hello again" ? [1, 1, 1, 1] : [1, 0, 0, 0])) })
      await memory.setConsent(false)
      await memory.setConsent(true)
      await memory.apply(["Likes tea", "Walks daily", "Reads novels", "Plays chess", "Keeps a journal"].map((content) => ({ op: "add" as const, content, kind: "detail" as const, entities: [] })), "c1")
      // Every memory scores 0.5: above the floor, but none stands out from the average.
      expect(await memory.recall({ message: "Hello again" })).toEqual([])
    })

    it("pulls memories about a person named in the message", async () => {
      const recalled = contents(await memory.recall({ message: "Ana didn't call me back." }))
      expect(recalled).toContain("Has a sister named Ana")
    })

    it("gives a teller the memories about the user's interactions with that teller only", async () => {
      expect(contents(await memory.recall({ message: "Hello again", tellerId: "mira-the-mystic" })))
        .toContain("Promised Mira to send the application this week")
      expect(contents(await memory.recall({ message: "Hello again", tellerId: "sage-the-seer" })))
        .not.toContain("Promised Mira to send the application this week")
    })

    it("caps recall at 8 and at 3 core memories", async () => {
      await memory.apply(Array.from({ length: 12 }, (_, index) => ({ op: "add" as const, content: `Core fact ${index} about family`, kind: "core" as const, entities: [] })), "c1")
      const recalled = await memory.recall({ message: "unrelated words" })
      expect(recalled.map((entry) => entry.content)).toEqual(["Name is Jo", "Core fact 0 about family", "Core fact 1 about family"])
      const family = await memory.recall({ message: "family" })
      expect(family.length).toBeLessThanOrEqual(8)
      expect(family.slice(0, 3).every((entry) => entry.kind === "core")).toBe(true)
      expect(family.length - 3).toBeLessThanOrEqual(3)
    })

    it("falls back to core and entity matches when the embedder is down", async () => {
      memory = new MemoryService(store, { embed: async () => { throw new Error("down") } })
      const recalled = contents(await memory.recall({ message: "Ana and my work", tellerId: "mira-the-mystic" }))
      expect(recalled).toEqual(["Name is Jo", "Has a sister named Ana", "Promised Mira to send the application this week"])
    })

    it("returns nothing without consent", async () => {
      await memory.setConsent(false)
      expect(await memory.recall({ message: "Ana" })).toEqual([])
    })
  })
})
