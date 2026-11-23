import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ChatList } from "./chat-list"
import { NewChat } from "./new-chat"
import { chatTellers } from "../lib/tellers"

const now = new Date(2026, 10, 23, 22, 0)
const today = new Date(2026, 10, 23, 21, 14).toISOString()
const conversations = [
  { id: "g", title: "Back to the band?", tellerIds: ["mira-the-mystic", "sage-the-seer"], lastMessage: { senderType: "teller" as const, senderId: "sage-the-seer", preview: "Toss again.", createdAt: today } },
  { id: "m", title: "Job offer", tellerIds: ["mira-the-mystic"] },
]
const list = (props: Partial<React.ComponentProps<typeof ChatList>> = {}) => renderToStaticMarkup(
  <ChatList conversations={conversations} tellers={chatTellers} activeId="m" query="" now={now} onQuery={() => undefined} onOpen={() => undefined} onNew={() => undefined} {...props} />,
)

describe("chat list", () => {
  it("has the wordmark, a labelled search box and a named new-chat button", () => {
    const markup = list()
    expect(markup).toContain("OracleChat")
    expect(markup).toContain('aria-label="Search chats"')
    expect(markup).toContain('aria-label="New chat"')
  })

  it("names each row after its tellers, like contacts, with the last message below", () => {
    const markup = list()
    expect(markup).toMatch(/class="row-title">Mira &amp; Sage</)
    expect(markup).toMatch(/class="row-title">Mira</)
    expect(markup).not.toContain("Back to the band?")
  })

  it("shows a group row with both avatars, its sender-prefixed preview and time", () => {
    const markup = list()
    expect(markup).toContain("Sage: Toss again.")
    expect(markup).toContain("21:14")
    expect(markup.match(/class="avatar[ "]/g)?.length).toBeGreaterThanOrEqual(3)
    expect(markup).toContain("avatar-group")
  })

  it("marks the open conversation", () => {
    expect(list()).toMatch(/aria-current="true"[^>]*>[\s\S]*row-title">Mira</)
  })

  it("filters rows by teller name, chat topic or last message", () => {
    for (const query of ["sage", "band", "toss again"]) {
      const markup = list({ query })
      expect(markup).toContain("Mira &amp; Sage")
      expect(markup).not.toMatch(/row-title">Mira</)
    }
  })

  it("invites a first chat when there are none", () => {
    expect(list({ conversations: [] })).toContain("No chats yet")
  })
})

describe("new chat", () => {
  const render = (props: Partial<React.ComponentProps<typeof NewChat>> = {}) =>
    renderToStaticMarkup(<NewChat tellers={chatTellers} onStart={() => undefined} onBack={() => undefined} {...props} />)

  it("lists every teller with their detail and a New group entry", () => {
    const markup = render()
    for (const teller of chatTellers) {
      expect(markup).toContain(teller.name)
      expect(markup).toContain(teller.detail)
    }
    expect(markup).toContain("New group")
    expect(markup).toContain('aria-label="Back"')
  })

  it("needs exactly two tellers for a group", () => {
    const one = render({ initialMode: "group", initialPicked: ["mira-the-mystic"] })
    expect(one).toMatch(/<button[^>]*disabled=""[^>]*>Create group/)
    const two = render({ initialMode: "group", initialPicked: ["mira-the-mystic", "astra-the-astrologer"] })
    expect(two).not.toMatch(/<button[^>]*disabled=""[^>]*>Create group/)
    expect(two).toContain('aria-checked="true"')
  })
})
