import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { BirthDetailsForm } from "./birth-details-form"

const render = (props: Partial<React.ComponentProps<typeof BirthDetailsForm>> = {}) =>
  renderToStaticMarkup(<BirthDetailsForm onSubmit={async () => undefined} searchPlaces={async () => []} {...props} />)

describe("birth details form", () => {
  it("asks for date, time and place, with a labelled place combobox", () => {
    const markup = render()
    expect(markup).toContain('type="date"')
    expect(markup).toContain('type="time"')
    expect(markup).toContain('role="combobox"')
    expect(markup).toContain('aria-autocomplete="list"')
    expect(markup).toContain("Birth place")
  })

  it("asks for consent, and can't be submitted until everything is filled in and consent is given", () => {
    const markup = render()
    expect(markup).toContain('type="checkbox"')
    expect(markup).toContain("Save my birth details on this computer")
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*disabled/)
  })

  it("credits GeoNames for the places", () => {
    expect(render()).toContain("GeoNames")
  })

  it("shows an error it was given", () => {
    expect(render({ error: "date must be a real date" })).toContain("date must be a real date")
  })

  it("is fully disabled when set aside, and says so", () => {
    const markup = render({ disabled: true, note: "This form was set aside." })
    expect(markup).toContain("<fieldset disabled")
    expect(markup).toContain("This form was set aside.")
  })

  it("can start from saved details, as in the profile panel", () => {
    const markup = render({ initial: { date: "1990-07-01", time: "12:00", place: { id: 1, name: "San Francisco", region: "California", country: "United States", latitude: 37.77, longitude: -122.42, timeZone: "America/Los_Angeles" } }, submitLabel: "Save changes" })
    expect(markup).toContain('value="1990-07-01"')
    expect(markup).toContain('value="12:00"')
    expect(markup).toContain("San Francisco, California, United States")
    expect(markup).toContain("Save changes")
  })
})
