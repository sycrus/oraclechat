import { newDb } from "pg-mem"
import { beforeEach, describe, expect, it } from "vitest"
import { PostgresChatStore } from "../../src/chat/store.js"
import type { Pool } from "pg"

describe("PostgresChatStore", () => {
  let store: PostgresChatStore

  beforeEach(async () => {
    const database = newDb()
    const { Pool: MemoryPool } = database.adapters.createPg()
    store = new PostgresChatStore(new MemoryPool() as unknown as Pool)
    await store.initialize()
  })

  it("persists a conversation, its tellers, and ordered attributed messages", async () => {
    await store.createConversation({
      id: "conversation-1",
      title: "Mira and Sage",
      tellerIds: ["mira-the-mystic", "sage-the-seer"],
    })
    await store.appendMessage({
      id: "message-1",
      conversationId: "conversation-1",
      senderType: "user",
      senderId: "local-user",
      content: "I am deciding whether to change careers.",
      reading: {
        spread: "one-card",
        cards: [{ position: "guidance", name: "The Fool", orientation: "upright", artKey: "major-0", meaning: "A new beginning." }],
      },
    })
    await store.appendMessage({
      id: "message-2",
      conversationId: "conversation-1",
      senderType: "teller",
      senderId: "mira-the-mystic",
      content: "Let's look at the decision from a new angle.",
      signatureCard: { position: "action", name: "Eight of Wands", orientation: "reversed", artKey: "wands-eight", meaning: "Slow down." },
    })

    const conversation = await store.getConversation("conversation-1")

    expect(conversation).toMatchObject({
      id: "conversation-1",
      title: "Mira and Sage",
      tellerIds: ["mira-the-mystic", "sage-the-seer"],
    })
    expect(conversation?.messages.map(({ id, senderType, senderId }) => ({ id, senderType, senderId }))).toEqual([
      { id: "message-1", senderType: "user", senderId: "local-user" },
      { id: "message-2", senderType: "teller", senderId: "mira-the-mystic" },
    ])
    expect(conversation?.messages[0]?.reading).toMatchObject({ spread: "one-card", cards: [{ name: "The Fool" }] })
    expect(conversation?.messages[1]?.signatureCard).toMatchObject({ position: "action", name: "Eight of Wands", orientation: "reversed" })
    expect(conversation?.messages[0]?.signatureCard).toBeUndefined()
    expect((await store.listConversations())).toHaveLength(1)
  })

  it("summarizes each conversation's newest message", async () => {
    await store.createConversation({ id: "c-last", title: "Mira", tellerIds: ["mira-the-mystic"] })
    await store.createConversation({ id: "c-empty", title: "Sage", tellerIds: ["sage-the-seer"] })
    await store.appendMessage({ id: "m-1", conversationId: "c-last", senderType: "user", senderId: "local-user", content: "Should I move?" })
    await store.appendMessage({ id: "m-2", conversationId: "c-last", senderType: "teller", senderId: "mira-the-mystic", content: "**The Star**, upright.\n\nHope returns." })

    const summaries = await store.listConversations()
    const last = summaries.find((item) => item.id === "c-last")
    const empty = summaries.find((item) => item.id === "c-empty")

    expect(last?.lastMessage).toMatchObject({ senderType: "teller", senderId: "mira-the-mystic", preview: "The Star, upright. Hope returns." })
    expect(typeof last?.lastMessage?.createdAt).toBe("string")
    expect(empty?.lastMessage).toBeUndefined()
  })

  it("removes a conversation and its messages", async () => {
    await store.createConversation({ id: "conversation-2", title: "Sage", tellerIds: ["sage-the-seer"] })
    await store.appendMessage({
      id: "message-3",
      conversationId: "conversation-2",
      senderType: "user",
      senderId: "local-user",
      content: "Hello",
    })

    await store.deleteConversation("conversation-2")

    expect(await store.getConversation("conversation-2")).toBeNull()
    expect(await store.listConversations()).toEqual([])
  })

  describe("interaction state", () => {
    const fan = {
      kind: "card-fan" as const, state: "open" as const, spread: "three-card" as const, size: 9, picks: [] as number[],
      hidden: [{ name: "The Fool", orientation: "upright" as const, artKey: "major-0", meaning: "A new beginning." }],
    }

    async function seeded() {
      await store.createConversation({ id: "c1", title: "Fan", tellerIds: ["mira-the-mystic"] })
      return store.appendMessage({ id: "m1", conversationId: "c1", senderType: "teller", senderId: "mira-the-mystic", content: "Pick.", interaction: fan })
    }

    it("round-trips an interaction with its hidden cards", async () => {
      const saved = await seeded()
      expect(saved.interaction).toEqual(fan)
      expect((await store.getConversation("c1"))!.messages[0]!.interaction).toEqual(fan)
    })

    it("changes state only from the expected state, and reports whether it did", async () => {
      await seeded()
      expect(await store.updateInteraction("m1", "open", { ...fan, picks: [0] })).toBe(true)
      expect((await store.getConversation("c1"))!.messages[0]!.interaction!.picks).toEqual([0])
      expect(await store.updateInteraction("m1", "revealed", { ...fan, picks: [0, 1] })).toBe(false)
      expect((await store.getConversation("c1"))!.messages[0]!.interaction!.picks).toEqual([0])
    })

    it("reports false for an unknown message", async () => {
      await seeded()
      expect(await store.updateInteraction("nope", "open", fan)).toBe(false)
    })

    it("leaves messages without an interaction unchanged", async () => {
      await store.createConversation({ id: "c2", title: "Plain", tellerIds: ["mira-the-mystic"] })
      const plain = await store.appendMessage({ id: "m2", conversationId: "c2", senderType: "user", senderId: "local-user", content: "Hi" })
      expect(plain).not.toHaveProperty("interaction")
    })
  })
})
