import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { IChingCard } from "./iching-view"
import type { IChingReading } from "../lib/iching"

const line = (value: 6 | 7 | 8 | 9) => ({ value, yang: value % 2 === 1, changing: value === 6 || value === 9 })
const reading: IChingReading = {
  method: "i-ching",
  lines: [9, 8, 8, 8, 8, 6].map((value) => line(value as 6 | 8 | 9)),
  primary: { number: 24, name: "Fu, Return", meaning: "A turning point arrives after a low stretch." },
  relating: { number: 23, name: "Bo, Stripping Away", meaning: "Things are wearing down from the outside." },
}
const render = (props: Partial<React.ComponentProps<typeof IChingCard>> = {}) =>
  renderToStaticMarkup(<IChingCard reading={reading} busy={false} onAsk={() => undefined} {...props} />)

describe("I Ching reading card", () => {
  it("shows both hexagrams by number and name with an arrow between", () => {
    const markup = render()
    expect(markup).toContain('aria-label="I Ching casting"')
    expect(markup).toMatch(/24[\s\S]*Return[\s\S]*23[\s\S]*Stripping Away/)
    expect(markup).toContain("Line by line")
  })

  it("marks changing lines and describes the cast", () => {
    const markup = render()
    expect(markup.match(/iching-line [a-z]+ is-changing/g)).toHaveLength(2)
    expect(markup).toContain("Hexagram lines from the top: broken changing, broken, broken, broken, broken, solid changing")
  })

  it("keeps the sheet closed until asked", () => {
    expect(render()).not.toContain('role="dialog"')
  })

  it("opens a sheet with meanings, trigrams, changing lines and suggested questions", () => {
    const markup = render({ initialOpen: true })
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain("A turning point arrives after a low stretch.")
    expect(markup).toContain("Things are wearing down from the outside.")
    expect(markup).toContain("Earth over Thunder")
    expect(markup).toContain("Mountain over Earth")
    expect(markup).toContain("Line 6")
    expect(markup).toContain("Line 1")
    expect(markup).toContain("What does line 6 mean?")
    expect(markup).toContain('aria-label="Close"')
  })

  it("disables suggestions while a reply is in progress", () => {
    expect(render({ initialOpen: true, busy: true })).toMatch(/<button[^>]*disabled=""[^>]*>What does line 6 mean\?/)
  })

  it("shows a single hexagram when nothing changes", () => {
    const still: IChingReading = { method: "i-ching", lines: [7, 8, 7, 8, 7, 8].map((value) => line(value as 7 | 8)), primary: { number: 63, name: "Ji Ji, After Completion", meaning: "m" } }
    const markup = renderToStaticMarkup(<IChingCard reading={still} busy={false} onAsk={() => undefined} />)
    expect(markup).toContain("After Completion")
    expect(markup).toContain("No changing lines")
  })
})
