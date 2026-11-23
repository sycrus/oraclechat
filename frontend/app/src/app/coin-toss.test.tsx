import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CoinToss } from "./coin-toss"
import type { CoinToss as Toss } from "../lib/toss"

const line = (value: 6 | 7 | 8 | 9) => ({ value, yang: value % 2 === 1, changing: value === 6 || value === 9 })
const base: Toss = { kind: "coin-toss", state: "casting", lines: [] }
const render = (props: Partial<{ toss: Toss; busy: boolean; initialHelp: boolean }> = {}) =>
  renderToStaticMarkup(<CoinToss toss={base} busy={false} onToss={() => undefined} {...props} />)

describe("coin toss view", () => {
  it("is a labelled group with a toss control, the count and the coin legend", () => {
    const markup = render()
    expect(markup).toContain('role="group"')
    expect(markup).toContain('aria-label="I Ching coin cast"')
    expect(markup).toContain("Toss the coins")
    expect(markup).toContain("0 of 6 lines tossed")
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain("COIN CAST")
  })

  it("folds the coin explanation behind a ? button", () => {
    const closed = render()
    expect(closed).toContain('aria-label="How the coins count"')
    expect(closed).toContain('aria-expanded="false"')
    expect(closed).not.toContain("6 or 9 is changing")
    const open = render({ initialHelp: true })
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain("heads")
    expect(open).toContain("tails")
    expect(open).toContain("6 or 9 is changing")
  })

  it("shows progress squares, the count, empty outlines for untossed lines and highlights the newest", () => {
    const markup = render({ toss: { kind: "coin-toss", state: "casting", lines: [line(9), line(8), line(8), line(8)] } })
    expect(markup.match(/class="pip on"/g)).toHaveLength(4)
    expect(markup.match(/class="pip"/g)).toHaveLength(2)
    expect(markup).toContain(">4 of 6<")
    expect(markup.match(/iching-line pending/g)).toHaveLength(4)
    expect(markup.match(/toss-line latest/g)).toHaveLength(1)
  })

  it("lists line 6 at the top and line 1 at the bottom", () => {
    const markup = render({ toss: { kind: "coin-toss", state: "casting", lines: [line(9), line(8)] } })
    expect(markup.indexOf("line 2 of 6")).toBeLessThan(markup.indexOf("line 1 of 6"))
  })

  it("disables tossing while busy", () => {
    expect(render({ busy: true })).toContain("disabled")
  })

  it("shows both sets side by side with short column headers", () => {
    const markup = render()
    expect(markup).toContain("FROM")
    expect(markup).toContain("BECOMING")
  })

  it("shows tossed lines with their coins, how they landed, and the line they form", () => {
    const markup = render({ toss: { kind: "coin-toss", state: "casting", lines: [line(7), line(6), line(9)] } })
    expect(markup).toContain("3 of 6 lines tossed")
    expect(markup).toContain("line 1 of 6, solid yang, steady")
    expect(markup).toContain("line 2 of 6, broken yin, changing")
    expect(markup).toContain("line 3 of 6, solid yang, changing")
    expect(markup).toContain("iching-line yang")
    expect(markup).toContain("iching-line yin")
    expect(markup).toContain("changing-mark")
    expect(markup).toContain("coin heads")
    expect(markup).toContain("coin tails")
    expect(markup).toContain("1 head, 2 tails — steady yang")
    expect(markup).toContain("0 heads, 3 tails — changing yin")
    expect(markup).toContain("3 heads, 0 tails — changing yang")
  })

  it("shows the changing line flipped in the becoming set, and matches the cast on steady lines", () => {
    const markup = render({ toss: { kind: "coin-toss", state: "casting", lines: [line(9), line(8)] } })
    // Cast: the 9 is solid, the 8 broken. Becoming: the 9 flips to broken, the 8 stays broken.
    expect(markup.match(/line-solid/g)).toHaveLength(1)
    expect(markup.match(/line-broken/g)).toHaveLength(3)
  })

  it("shows a set-aside note instead of a toss control", () => {
    const markup = render({ toss: { kind: "coin-toss", state: "set-aside", lines: [line(7)] } })
    expect(markup).not.toContain("Toss the coins")
    expect(markup).toContain("This cast was set aside.")
  })
})
