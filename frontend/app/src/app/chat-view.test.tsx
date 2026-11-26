import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ChatHeader, ChatView, type ChatViewProps } from "./chat-view"
import { chatTellers } from "../lib/tellers"

const noop = () => undefined
const user = (id: string, content: string) => ({ id, senderType: "user" as const, senderId: "local-user", content, createdAt: "2026-11-23T20:02:00.000Z" })
const teller = (id: string, senderId: string, content: string) => ({ id, senderType: "teller" as const, senderId, content, createdAt: "2026-11-23T20:03:00.000Z" })

const view = (props: Partial<ChatViewProps> = {}) => renderToStaticMarkup(<ChatView
  conversation={{ id: "c", title: "Back to the band?", tellerIds: ["mira-the-mystic", "sage-the-seer"], messages: [
    user("1", "Should I go back?"), teller("2", "mira-the-mystic", "First.\n\nSecond."), teller("3", "sage-the-seer", "Toss the coins."), user("4", "Ok"),
  ] }}
  tellers={chatTellers} busy={false} interactionBusy={false} streaming={false} completedReplies={0} draft="" onDraft={noop} onSend={noop}
  onBack={noop} onDelete={noop} onInteract={async () => undefined} searchPlaces={async () => []} {...props} />)

describe("chat header", () => {
  const header = (props: Partial<React.ComponentProps<typeof ChatHeader>> = {}) => renderToStaticMarkup(<ChatHeader tellerIds={["mira-the-mystic"]} tellers={chatTellers} onBack={noop} onDelete={noop} {...props} />)

  it("has a named back button, the teller's name and a menu", () => {
    const markup = header()
    expect(markup).toContain('aria-label="Back to chats"')
    expect(markup).toContain("<strong>Mira</strong>")
    expect(markup).toContain('aria-label="More options"')
  })

  it("offers a video call only when given one", () => {
    expect(header()).not.toContain("Video call")
    expect(header({ onCall: noop })).toContain('aria-label="Video call Mira"')
  })

  it("lists a group's members", () => {
    expect(header({ tellerIds: ["mira-the-mystic", "sage-the-seer"] })).toContain("Mira, Sage, You")
  })

  it("shows the typing status while a teller is answering", () => {
    expect(header({ status: "typing…" })).toContain("typing…")
  })

  it("offers Delete chat in the open menu", () => {
    expect(header()).not.toContain("Delete chat")
    expect(header({ initialMenuOpen: true })).toContain("Delete chat")
  })
})

describe("chat view", () => {
  it("tails the first bubble of each run and names tellers in a group", () => {
    const markup = view()
    expect(markup.match(/message-bubble tail/g)).toHaveLength(4)
    expect(markup.match(/class="sender-name/g)).toHaveLength(2)
    expect(markup).toMatch(/sender-name[^>]*>Mira</)
    expect(markup).toMatch(/sender-name[^>]*>Sage</)
  })

  it("names nobody one-to-one", () => {
    const markup = view({ conversation: { id: "c", title: "Job", tellerIds: ["mira-the-mystic"], messages: [user("1", "Hi"), teller("2", "mira-the-mystic", "Hello.")] } })
    expect(markup).not.toContain("sender-name")
  })

  it("ticks your messages: answered once a teller follows, sent otherwise", () => {
    const markup = view()
    expect(markup).toContain('aria-label="Answered"')
    expect(markup).toContain('aria-label="Sent"')
  })

  it("has a message box with a named send button", () => {
    const markup = view({ draft: "Hello" })
    expect(markup).toContain('aria-label="Message"')
    expect(markup).toContain('aria-label="Send message"')
  })

  it("shows the thinking indicator while waiting for a reply to start", () => {
    expect(view({ busy: true })).toContain('role="status"')
    expect(view()).not.toContain('role="status"')
  })
})

describe("day pills", () => {
  it("shows one date pill above each day's first message", () => {
    const old = (id: string, content: string) => ({ ...user(id, content), createdAt: "2026-10-18T09:00:00.000Z" })
    const markup = view({ conversation: { id: "c", title: "Job", tellerIds: ["mira-the-mystic"], messages: [old("1", "Hi"), old("2", "Still there?"), user("3", "Back again")] } })
    expect(markup.match(/class="day-pill"/g)).toHaveLength(2)
    expect(markup).toContain("18 Oct 2026")
    expect(markup.indexOf("18 Oct 2026")).toBeLessThan(markup.indexOf("Hi"))
  })
})

describe("paced reply reveal (chat spec: Paced reply reveal)", () => {
  const card = (position: string, name: string, artKey: string) => ({ position, name, artKey, orientation: "upright", meaning: "m" })
  const reading = { spread: "three-card", cards: [card("past", "The Fool", "major-0"), card("present", "The Star", "major-17"), card("future", "The Sun", "major-19")] }
  const conversation = { id: "c", title: "Band", tellerIds: ["mira-the-mystic", "sage-the-seer"], messages: [
    user("1", "Should I go back?"), { ...teller("2", "mira-the-mystic", "First.\n\nSecond."), reading }, teller("3", "sage-the-seer", "Toss the coins."),
  ] }

  it("shows the bubbles revealed so far, then typing dots", () => {
    const markup = view({ conversation, pace: { "2": { bubbles: 1, typing: true, hidden: false }, "3": { bubbles: 0, typing: false, hidden: true } } })
    expect(markup).toContain("First.")
    expect(markup).not.toContain("Second.")
    expect(markup.indexOf("thinking-dots")).toBeGreaterThan(markup.indexOf("First."))
  })

  it("shows only the name and typing dots before the first bubble, with no reading yet", () => {
    const markup = view({ conversation, pace: { "2": { bubbles: 0, typing: true, hidden: false }, "3": { bubbles: 0, typing: false, hidden: true } } })
    expect(markup).toContain(">Mira</span>")
    expect(markup).toContain("thinking-dots")
    expect(markup).not.toContain("First.")
    expect(markup).not.toContain("tarot-spread")
    expect(markup).not.toContain("Reading the moment")
  })

  it("shows the reading once the first bubble is shown", () => {
    expect(view({ conversation, pace: { "2": { bubbles: 1, typing: true, hidden: false } } })).toContain("tarot-spread")
  })

  it("renders nothing of a hidden reply", () => {
    const markup = view({ conversation, pace: { "2": { bubbles: 2, typing: false, hidden: false }, "3": { bubbles: 0, typing: false, hidden: true } } })
    expect(markup).toContain("Second.")
    expect(markup).not.toContain("Toss the coins.")
    expect(markup).not.toContain(">Sage</span>")
  })

  it("hides the generic thinking bubble while a reply is typing, and says typing… in the header", () => {
    const markup = view({ conversation, busy: true, pace: { "2": { bubbles: 1, typing: true, hidden: false } } })
    expect(markup).not.toContain('role="status"')
    expect(markup).toContain("typing…")
  })
})

describe("reading order", () => {
  it("shows the teller's words first, then the cards and action card", () => {
    const card = (position: string, name: string, artKey: string) => ({ position, name, artKey, orientation: "upright", meaning: "m" })
    const reply = { ...teller("2", "mira-the-mystic", "Here is what the cards say."), reading: { spread: "three-card", cards: [card("past", "The Fool", "major-0"), card("present", "The Star", "major-17"), card("future", "The Sun", "major-19")] }, signatureCard: { ...card("action", "Two of Wands", "wands-two"), position: "action" as const, orientation: "upright" as const } }
    const markup = view({ conversation: { id: "c", title: "Job", tellerIds: ["mira-the-mystic"], messages: [user("1", "Read for me"), reply] } })
    const words = markup.indexOf("Here is what the cards say.")
    expect(words).toBeGreaterThan(-1)
    expect(markup.indexOf("tarot-spread")).toBeGreaterThan(words)
    expect(markup.indexOf("signature-card")).toBeGreaterThan(words)
  })
})
