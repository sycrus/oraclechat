import React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CardFan } from "./card-fan"
import type { CardFan as Fan } from "../lib/fan"

const fan = (extra: Partial<Fan> = {}): Fan => ({ kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [], ...extra })
const render = (value: Fan, busy = false) => renderToStaticMarkup(<CardFan fan={value} busy={busy} onPick={() => undefined} onUnpick={() => undefined} onReveal={() => undefined} />)
const buttons = (markup: string) => [...markup.matchAll(/<button\b[^>]*>/g)].map((match) => match[0])

describe("CardFan", () => {
  it("shows one native button per card, named by place and picked state", () => {
    const markup = render(fan({ picks: [3] }))
    const cards = buttons(markup).filter((tag) => tag.includes("fan-card"))
    expect(cards).toHaveLength(9)
    expect(cards.every((tag) => tag.includes('type="button"'))).toBe(true)
    expect(markup).toContain('aria-label="card 1 of 9, face-down, not picked"')
    expect(markup).toContain('aria-label="card 4 of 9, face-down, picked"')
  })

  it("marks picked cards so they can be styled", () => {
    const cards = buttons(render(fan({ picks: [3] }))).filter((tag) => tag.includes("fan-card"))
    expect(cards.filter((tag) => tag.includes('class="fan-card picked"'))).toHaveLength(1)
  })

  it("shows how many are picked out of how many are needed", () => {
    expect(render(fan({ picks: [1, 2] }))).toContain("2 of 3 picked")
    expect(render(fan({ spread: "celtic-cross", size: 16 }))).toContain("0 of 10 picked")
  })

  it("offers the reveal only with the right number of picks", () => {
    const reveal = (value: Fan) => buttons(render(value)).find((tag) => tag.includes("fan-reveal"))!
    expect(reveal(fan({ picks: [1, 2] }))).toContain("disabled")
    expect(reveal(fan({ picks: [1, 2, 3] }))).not.toContain("disabled")
    expect(reveal(fan({ picks: [1, 2, 3] }))).toContain("type=\"button\"")
  })

  it("labels the reveal control", () => {
    expect(render(fan({ picks: [1, 2, 3] }))).toContain("Reveal the cards")
  })

  it("disables every control while a request is in flight", () => {
    const tags = buttons(render(fan({ picks: [1, 2, 3] }), true))
    expect(tags.length).toBeGreaterThan(9)
    expect(tags.every((tag) => tag.includes("disabled"))).toBe(true)
  })

  it("shows a set-aside fan as closed, with no reveal and no pickable cards", () => {
    const markup = render(fan({ state: "set-aside", picks: [1] }))
    expect(markup).toContain("set aside")
    expect(markup).not.toContain("Reveal the cards")
    expect(buttons(markup).every((tag) => tag.includes("disabled"))).toBe(true)
  })
})

describe("reveal animation", () => {
  it("is switched off when the user prefers reduced motion", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")
    const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([^]*?)\n\}/g)].map((match) => match[1]).join("\n")
    expect(css).toMatch(/\.fan-dealt \.tarot-card\s*\{[^}]*animation:\s*fan-flip/)
    expect(reduced).toMatch(/\.fan-dealt \.tarot-card\s*\{[^}]*animation:\s*none/)
  })
})

describe("picked cards", () => {
  it("stay gold while hovered (a tapped card keeps :hover on phones)", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")
    const hover = /([^{}]*:hover[^{}]*)\{[^}]*(background|--card-back)/.exec(css.slice(css.indexOf(".fan-card")))?.[1] ?? ""
    expect(hover).toContain(".fan-card")
    expect(hover).toContain(":not(.picked)")
  })
})

describe("card backs", () => {
  it("draws every face-down card with a pixel tarot back", () => {
    const markup = renderToStaticMarkup(<CardFan fan={{ kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [1] }} busy={false} onPick={() => undefined} onUnpick={() => undefined} onReveal={() => undefined} />)
    expect(markup.match(/class="card-back"/g)).toHaveLength(9)
    expect(markup).toContain('viewBox="0 0 10 16"')
    expect(markup).toContain('shape-rendering="crispEdges"')
  })
})

