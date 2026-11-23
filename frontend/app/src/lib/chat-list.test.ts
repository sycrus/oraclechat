import { describe, expect, it } from "vitest"
import { chatName, filterChats, previewLine, timeLabel, withListTitle, withOpened, type ConversationSummary } from "./chat-list"

const now = new Date(2026, 10, 23, 22, 0) // Monday 23 November 2026, 22:00 local
const at = (days: number, hours = 21, minutes = 14) => {
  const date = new Date(now)
  date.setDate(date.getDate() - days)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

describe("timeLabel", () => {
  it("shows the clock time for today", () => expect(timeLabel(at(0), now)).toBe("21:14"))
  it("pads single-digit hours", () => expect(timeLabel(at(0, 8, 5), now)).toBe("08:05"))
  it("says Yesterday for yesterday", () => expect(timeLabel(at(1), now)).toBe("Yesterday"))
  it("names the weekday within the past week", () => expect(timeLabel(at(3), now)).toBe("Friday"))
  it("shows the date for older messages", () => expect(timeLabel(at(30), now)).toBe("24 Oct 2026"))
})

const tellers = [{ id: "mira-the-mystic", name: "Mira" }, { id: "sage-the-seer", name: "Sage" }]
const summary = (over: Partial<ConversationSummary>): ConversationSummary => ({ id: "c", title: "Should I move?", tellerIds: ["mira-the-mystic"], ...over })

describe("previewLine", () => {
  it("prefixes your own messages with You", () => {
    expect(previewLine(summary({ lastMessage: { senderType: "user", senderId: "local-user", preview: "Hello", createdAt: at(0) } }), tellers)).toBe("You: Hello")
  })

  it("prefixes a teller's message with their name in a group", () => {
    const group = summary({ tellerIds: ["mira-the-mystic", "sage-the-seer"], lastMessage: { senderType: "teller", senderId: "sage-the-seer", preview: "Toss again.", createdAt: at(0) } })
    expect(previewLine(group, tellers)).toBe("Sage: Toss again.")
  })

  it("leaves a teller's message bare one-to-one", () => {
    expect(previewLine(summary({ lastMessage: { senderType: "teller", senderId: "mira-the-mystic", preview: "The Star.", createdAt: at(0) } }), tellers)).toBe("The Star.")
  })

  it("is empty with no messages", () => expect(previewLine(summary({}), tellers)).toBe(""))
})

describe("chatName", () => {
  const tellers = [{ id: "mira-the-mystic", name: "Mira" }, { id: "sage-the-seer", name: "Sage" }]
  it("is the teller's name, or both names for a group", () => {
    expect(chatName(["mira-the-mystic"], tellers)).toBe("Mira")
    expect(chatName(["mira-the-mystic", "sage-the-seer"], tellers)).toBe("Mira & Sage")
  })
})

describe("filterChats", () => {
  const tellers = [{ id: "mira-the-mystic", name: "Mira" }, { id: "sage-the-seer", name: "Sage" }]
  const list = [
    summary({ id: "a", title: "My old Band", tellerIds: ["mira-the-mystic"] }),
    summary({ id: "b", title: "Moving cities", tellerIds: ["sage-the-seer"], lastMessage: { senderType: "teller", senderId: "sage-the-seer", preview: "Pack lightly.", createdAt: at(0) } }),
  ]
  it("matches teller names, chat topics and the last message, ignoring case", () => {
    expect(filterChats(list, "sage", tellers).map((item) => item.id)).toEqual(["b"])
    expect(filterChats(list, "band", tellers).map((item) => item.id)).toEqual(["a"])
    expect(filterChats(list, "PACK", tellers).map((item) => item.id)).toEqual(["b"])
  })
  it("returns everything for a blank query", () => expect(filterChats(list, "  ", tellers)).toHaveLength(2))
})

describe("withListTitle", () => {
  it("takes the open chat's title from the refreshed list", () => {
    const open = { id: "a", title: "New reading", messages: [1] }
    expect(withListTitle(open, [summary({ id: "a", title: "Can you cast the I Ching?" })])).toEqual({ id: "a", title: "Can you cast the I Ching?", messages: [1] })
  })
  it("leaves the chat alone when it isn't listed or nothing is open", () => {
    const open = { id: "a", title: "New reading" }
    expect(withListTitle(open, [summary({ id: "b", title: "Other" })])).toBe(open)
    expect(withListTitle(null, [summary({ id: "a", title: "Other" })])).toBeNull()
  })
})

describe("withOpened", () => {
  it("adds a new chat to the top, and leaves an existing chat where it is", () => {
    const list = [summary({ id: "a" }), summary({ id: "b" })]
    expect(withOpened(list, summary({ id: "c" })).map((item) => item.id)).toEqual(["c", "a", "b"])
    expect(withOpened(list, summary({ id: "b" })).map((item) => item.id)).toEqual(["a", "b"])
  })
})
