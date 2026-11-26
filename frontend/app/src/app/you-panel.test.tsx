import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { YouPanel, type YouPanelProps } from "./you-panel"

const noop = () => undefined
const render = (props: Partial<YouPanelProps> = {}) => renderToStaticMarkup(<YouPanel
  memoryConsent={false} hostedReplies={false} guardrails={false} hostedConsent={false} memories={[]} birthDetails={null} hasConversations
  onConsent={noop} onHostedConsent={noop} onPin={noop} onEdit={noop} onDeleteMemory={noop}
  onSaveBirth={async () => undefined} onDeleteBirth={noop} onClearHistory={noop} searchPlaces={async () => []} {...props} />)

describe("You tab", () => {
  it("shows memory consent off with nothing saved", () => {
    const markup = render()
    expect(markup).toContain("Remember details")
    expect(markup).toContain("Memory is off")
    expect(markup).toContain("Nothing is saved until you turn this on")
  })

  it("offers hosted sharing only with memory on and hosted replies", () => {
    expect(render({ memoryConsent: true })).not.toContain("Share saved details with the hosted model")
    expect(render({ memoryConsent: true, hostedReplies: true })).toContain("Share saved details with the hosted model")
  })

  it("lists saved memories when memory is on", () => {
    const markup = render({ memoryConsent: true, memories: [{ id: "m", content: "Works as a nurse", kind: "detail", entities: [] }] })
    expect(markup).toContain("Works as a nurse")
    expect(markup).toContain("Turn off and delete all saved details")
  })

  it("has the birth details form and, when saved, a delete button", () => {
    expect(render()).toContain("Save birth details")
    expect(render({ birthDetails: undefined })).toContain("Loading")
    const saved = render({ birthDetails: { date: "1990-07-01", time: "12:00", place: { id: 1, name: "Lisbon", region: "Lisbon", country: "Portugal", latitude: 38.7, longitude: -9.1, timeZone: "Europe/Lisbon" } } })
    expect(saved).toContain("Delete my birth details")
  })

  it("offers clearing chat history only when there are chats", () => {
    expect(render()).toContain("Clear chat history")
    expect(render({ hasConversations: false })).not.toContain("Clear chat history")
  })

  it("says where replies are generated", () => {
    expect(render()).toContain("Local models")
    expect(render({ hostedReplies: true })).toContain("Hosted model")
    expect(render({ guardrails: true })).toContain("Local models · OpenAI guardrails")
  })
})
