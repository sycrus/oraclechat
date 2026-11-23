import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { callableTeller } from "../../lib/call/tellers"
import { CallOverlayView, type CallOverlayViewProps } from "./call-overlay-view"
import { CallPanel } from "./call-panel"
import type { CallPanelContent } from "../../lib/call/reading"
import { chartReading } from "../../lib/fixtures/chart-reading"

const tellers = [
  { id: "mira-the-mystic", name: "Mira", model: "/tellers/mira/mira.vrm" },
  { id: "sage-the-seer", name: "Sage", model: "/tellers/sage/sage.vrm" },
]

describe("call button", () => {
  it("is offered for a one-to-one chat with a teller that has a model", () => {
    expect(callableTeller(["mira-the-mystic"], tellers)?.name).toBe("Mira")
    expect(callableTeller(["sage-the-seer"], tellers)?.name).toBe("Sage")
  })

  it("is not offered for group chats", () => {
    expect(callableTeller(["mira-the-mystic", "sage-the-seer"], tellers)).toBeUndefined()
  })
})

const base: CallOverlayViewProps = {
  tellerName: "Mira",
  voice: "online",
  model: "ready",
  state: "idle",
  draft: "",
  onDraft: () => undefined,
  onSay: () => undefined,
  onEnd: () => undefined,
}
const render = (props: Partial<CallOverlayViewProps>) => renderToStaticMarkup(<CallOverlayView {...base} {...props} />)

describe("call overlay", () => {
  it("is a labelled dialog with an end-call button and a sentence box", () => {
    const markup = render({})
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain("Video call with Mira")
    expect(markup).toContain('aria-label="End call"')
    expect(markup).toContain('aria-label="Message for Mira"')
    expect(markup).not.toContain("Voice offline")
  })

  it("shows the voice-offline notice and the sentence as a subtitle", () => {
    const markup = render({ voice: "offline", subtitle: "Hello, I'm Mira" })
    expect(markup).toContain("Voice offline")
    expect(markup).toContain("Hello, I&#x27;m Mira")
  })

  it("falls back to the avatar with a notice when the model cannot load", () => {
    const markup = render({ model: "failed" })
    expect(markup).toContain("Model unavailable")
    expect(markup).toContain('class="call-avatar-fallback"')
  })

  it("shows input errors", () => {
    expect(render({ error: "Keep it under 500 characters." })).toContain("Keep it under 500 characters.")
  })

  it("marks the call state", () => {
    expect(render({ state: "speaking" })).toContain('data-state="speaking"')
    expect(render({})).toContain('data-state="idle"')
  })

  it("shows an ellipsis while thinking", () => {
    const markup = render({ state: "thinking" })
    expect(markup).toContain('data-state="thinking"')
    expect(markup).toContain('class="call-subtitle"')
    expect(markup).toContain(">…<")
  })

  it("shows a mic button that mutes and unmutes", () => {
    const on = render({ mic: "on" })
    expect(on).toContain('aria-label="Mute microphone"')
    expect(on).toContain('aria-pressed="false"')
    const muted = render({ mic: "muted" })
    expect(muted).toContain('aria-label="Unmute microphone"')
    expect(muted).toContain('aria-pressed="true"')
  })

  it("has no mic button before the microphone is set up", () => {
    expect(render({})).not.toContain("microphone")
  })

  it("tells the owner to type when the microphone is blocked", () => {
    const markup = render({ mic: "blocked" })
    expect(markup).toContain("Microphone unavailable — type instead")
    expect(markup).not.toContain("Mute microphone")
  })

  it("tells the owner to type when recognition is offline", () => {
    const markup = render({ mic: "on", listening: "offline" })
    expect(markup).toContain("Can&#x27;t hear you right now — type instead")
    expect(markup).not.toContain("Mute microphone")
  })

  it("marks when the owner is being heard", () => {
    expect(render({ mic: "on", hearing: true })).toContain('class="call-mic hearing"')
  })

  it("shows what the owner said while the teller thinks", () => {
    const markup = render({ state: "thinking", ownerCaption: "Should I start the novel?" })
    expect(markup).toContain("You: Should I start the novel?")
    expect(markup).not.toContain(">…<")
  })

  it("disables sending while a turn is in flight", () => {
    const markup = render({ busy: true, draft: "Hello" })
    expect(markup).toMatch(/<button type="submit" disabled=""/)
  })

  it("puts the name in the title bar and every input on one call bar", () => {
    const markup = render({ mic: "on", listening: "ok" })
    expect(markup).toMatch(/class="call-title"[^>]*>Mira</)
    const bar = /<form class="call-bar[^"]*"[\s\S]*?<\/form>/.exec(markup)?.[0] ?? ""
    for (const label of ['aria-label="Message for Mira"', 'aria-label="Send"', 'aria-label="Mute microphone"', 'aria-label="End call"']) expect(bar).toContain(label)
    expect(markup).not.toContain('aria-label="Messages"')
  })

  it("keeps the typed input and end call on the bar when the mic is blocked, without a mic toggle", () => {
    const markup = render({ mic: "blocked" })
    expect(markup).toContain('aria-label="Message for Mira"')
    expect(markup).toContain('aria-label="End call"')
    expect(markup).not.toContain('aria-label="Mute microphone"')
  })
})

describe("call panel", () => {
  it("sits just above the call bar", () => {
    const markup = render({ mic: "on", listening: "ok", panel: <p>PANEL</p> })
    expect(markup.indexOf("PANEL")).toBeGreaterThan(-1)
    expect(markup.indexOf("PANEL")).toBeLessThan(markup.indexOf('aria-label="Message for Mira"'))
  })

  const noop = () => undefined
  const show = (panel: CallPanelContent) => renderToStaticMarkup(<CallPanel tellerName="Mira" panel={panel} busy={false} onInteract={noop} onAsk={noop} searchPlaces={async () => []} />)
  const card = (position: "past" | "present" | "future" | "guidance", name: string, artKey: string, orientation: "upright" | "reversed" = "upright") => ({ position, name, artKey, orientation, meaning: "m" })

  it("shows the drawn cards with name, position and orientation", () => {
    const markup = show({ kind: "cards", cards: { spread: { spread: "three-card", cards: [card("past", "The Fool", "major-0"), card("present", "The Star", "major-17", "reversed"), card("future", "Ace of Cups", "cups-ace")] } } })
    expect(markup).toContain('aria-label="Cards Mira drew"')
    for (const text of ["The Fool", "The Star", "Ace of Cups", "past", "present", "future", "reversed"]) expect(markup).toContain(text)
    expect(markup.match(/<figure/g)).toHaveLength(3)
    expect(markup.match(/viewBox="0 0 24 36"/g)).toHaveLength(3)
    expect(markup).toContain('aria-label="The Star, reversed"')
  })

  it("labels the signature card", () => {
    const markup = show({ kind: "cards", cards: {
      spread: { spread: "one-card", cards: [card("guidance", "The Sun", "major-19")] },
      signature: { position: "action", name: "Two of Wands", artKey: "wands-two", orientation: "upright", meaning: "m" },
    } })
    expect(markup.match(/<figure/g)).toHaveLength(2)
    expect(markup).toContain("Action card")
  })

  it("shows the readings note", () => {
    expect(show({ kind: "note", note: "Mira drew 3 cards — see chat" })).toContain("Mira drew 3 cards — see chat")
  })

  it("shows the fan, the coin toss and the birth details invite", () => {
    expect(show({ kind: "fan", fan: { kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [] } })).toContain("Fan of face-down tarot cards")
    expect(show({ kind: "toss", toss: { kind: "coin-toss", state: "casting", lines: [] } })).toContain("I Ching coin cast")
    expect(show({ kind: "form", state: "open" })).toContain("Add birth details")
  })

  it("shows the I Ching card and the chart summary", () => {
    const line = (value: 7 | 8) => ({ value, yang: value === 7, changing: false })
    expect(show({ kind: "iching", reading: { method: "i-ching", lines: [7, 8, 7, 8, 7, 8].map((value) => line(value as 7 | 8)), primary: { number: 64, name: "Wei Ji, Before Completion", meaning: "m" } } })).toContain("Line by line")
    expect(show({ kind: "chart", reading: chartReading })).toContain("chart-summary")
  })
})
