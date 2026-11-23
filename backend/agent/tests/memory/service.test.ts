import { newDb } from "pg-mem"
import { beforeEach, describe, expect, it } from "vitest"
import type { Pool } from "pg"
import { MemoryService } from "../../src/memory/service.js"
import { PostgresMemoryStore } from "../../src/memory/store.js"
import { PostgresChatStore } from "../../src/chat/store.js"

describe("consented memory", () => {
  let store: PostgresMemoryStore
  let chats: PostgresChatStore
  let memory: MemoryService

  beforeEach(async () => {
    const database = newDb()
    const { Pool: MemoryPool } = database.adapters.createPg()
    store = new PostgresMemoryStore(new MemoryPool() as unknown as Pool)
    chats = new PostgresChatStore(new MemoryPool() as unknown as Pool)
    await chats.initialize()
    await store.initialize()
    memory = new MemoryService(store)
  })

  it("does not expose or save memories before explicit consent", async () => {
    expect(await memory.list()).toEqual([])
    await expect(memory.remember("Works in design", "conversation-1")).rejects.toThrow("consent")
  })

  it("keeps hosted sharing off by default, requires memory consent for it, and clears it on revocation", async () => {
    expect(await memory.hasHostedConsent()).toBe(false)
    await expect(memory.setHostedConsent(true)).rejects.toThrow("Memory consent is required")
    expect(await memory.hasHostedConsent()).toBe(false)

    await memory.setConsent(true)
    expect(await memory.hasHostedConsent()).toBe(false)
    await memory.setHostedConsent(true)
    expect(await memory.hasHostedConsent()).toBe(true)
    await memory.setHostedConsent(false)
    expect(await memory.hasHostedConsent()).toBe(false)

    await memory.setHostedConsent(true)
    await memory.setConsent(false)
    expect(await memory.hasHostedConsent()).toBe(false)
    await memory.setConsent(true)
    expect(await memory.hasHostedConsent()).toBe(false)
  })

  it("supports opt-in, view, edit, delete, and revocation cleanup", async () => {
    await chats.createConversation({ id: "conversation-1", title: "Reading", tellerIds: ["mira-the-mystic"] })
    await memory.setConsent(true)
    const saved = await memory.remember("Works in design", "conversation-1")
    expect(await memory.list()).toHaveLength(1)
    await memory.edit(saved.id, { content: "Works in product design" })
    expect((await memory.list())[0]?.content).toBe("Works in product design")
    await memory.delete(saved.id)
    expect(await memory.list()).toEqual([])
    await memory.remember("Has a new job", "conversation-1")
    await memory.setConsent(false)
    expect(await memory.list()).toEqual([])
  })

  it("deletes memories when their source conversation is deleted", async () => {
    await chats.createConversation({ id: "conversation-source", title: "Reading", tellerIds: ["sage-the-seer"] })
    await memory.setConsent(true)
    await memory.remember("Prefers reflective questions", "conversation-source")
    await chats.deleteConversation("conversation-source")
    expect(await memory.list()).toEqual([])
  })

  it("keeps memories, without a source, when all chat history is cleared", async () => {
    await chats.createConversation({ id: "conversation-a", title: "A", tellerIds: ["sage-the-seer"] })
    await chats.createConversation({ id: "conversation-b", title: "B", tellerIds: ["mira-the-mystic"] })
    await chats.appendMessage({ id: "msg-a", conversationId: "conversation-a", senderType: "user", senderId: "local-user", content: "Hi" })
    await memory.setConsent(true)
    await memory.remember("Prefers reflective questions", "conversation-a")
    await memory.remember("Has a sister named Ana", "conversation-b")

    await memory.keepAfterChatClear()
    await chats.deleteAllConversations()

    expect(await chats.listConversations()).toEqual([])
    const kept = await memory.list()
    expect(kept.map((item) => item.content).sort()).toEqual(["Has a sister named Ana", "Prefers reflective questions"])
    expect(kept.every((item) => item.sourceConversationId === null)).toBe(true)
  })
})
