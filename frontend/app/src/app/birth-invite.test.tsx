import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { BirthInvite } from "./birth-invite"

const render = (props: Partial<React.ComponentProps<typeof BirthInvite>> = {}) =>
  renderToStaticMarkup(<BirthInvite state="open" busy={false} onSubmit={async () => undefined} searchPlaces={async () => []} {...props} />)

describe("birth details invitation", () => {
  it("offers Add birth details while open, with the form closed", () => {
    const markup = render()
    expect(markup).toContain("Birth details")
    expect(markup).toContain("Add birth details")
    expect(markup).not.toContain('role="dialog"')
  })

  it("opens the full-screen form with date, time, place and consent", () => {
    const markup = render({ initialOpen: true })
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain("sheet-layer full")
    expect(markup).toContain('type="date"')
    expect(markup).toContain('type="time"')
    expect(markup).toContain('role="combobox"')
    expect(markup).toContain("Save my birth details on this computer")
    expect(markup).toContain("Read my chart")
  })

  it("shows Submitted and no button once submitted", () => {
    const markup = render({ state: "submitted" })
    expect(markup).toContain("Submitted")
    expect(markup).not.toContain("Add birth details")
  })

  it("says when it was set aside and can't be opened", () => {
    const markup = render({ state: "set-aside" })
    expect(markup).toContain("set aside")
    expect(markup).not.toContain("Add birth details")
  })

  it("disables the button while a reply is in progress", () => {
    expect(render({ busy: true })).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*Add birth details/)
  })
})
