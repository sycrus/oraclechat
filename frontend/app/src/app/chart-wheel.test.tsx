import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ChartSummary, ChartView, markerLongitudes } from "./chart-wheel"
import { chartReading as reading } from "../lib/fixtures/chart-reading"


const count = (markup: string, text: string) => markup.split(text).length - 1
const noop = () => undefined

describe("chart summary card", () => {
  const markup = renderToStaticMarkup(<ChartSummary reading={reading} busy={false} onAsk={noop} />)

  it("is a labelled region with a small wheel image", () => {
    expect(markup).toContain('aria-label="Birth chart"')
    expect(markup).toContain('role="img"')
  })

  it("shows the Sun, Moon and ascendant", () => {
    expect(markup).toContain("Aries 12°")
    expect(markup).toContain("Taurus 15°")
    expect(markup).toContain("Virgo 26°")
  })

  it("names two transits and counts the rest, with a button to the full chart", () => {
    expect(markup).toContain("Saturn square Moon")
    expect(markup).toContain("Jupiter trine Sun")
    expect(markup).toContain("+1")
    expect(markup).toContain("Open full chart")
    expect(markup).not.toContain('role="dialog"')
  })

  it("says when there are no close transits, and notes an ambiguous birth time", () => {
    const quiet = renderToStaticMarkup(<ChartSummary reading={{ ...reading, transits: [], note: "ambiguous" }} busy={false} onAsk={noop} />)
    expect(quiet).toContain("No close transits right now")
    expect(quiet).toContain("birth time happened twice")
  })
})

describe("full chart view", () => {
  const view = (props: Partial<React.ComponentProps<typeof ChartView>> = {}) =>
    renderToStaticMarkup(<ChartView reading={reading} busy={false} onAsk={noop} onClose={noop} {...props} />)

  it("draws twelve sign labels, a marker per planet and the ascendant line to 9 o'clock", () => {
    const markup = view()
    expect(count(markup, 'class="sign-label')).toBe(12)
    expect(count(markup, 'class="planet-marker')).toBe(10)
    expect(markup).toMatch(/class="ascendant-line"[^>]*x2="-4\d(\.\d+)?"/)
  })

  it("lists placements and angles as text on the Placements tab", () => {
    const markup = view()
    expect(markup).toContain('aria-selected="true"')
    expect(markup).toContain("Sun in Aries, 12°, 1st house")
    expect(markup).toContain("Saturn in Scorpio, 0°, 7th house, retrograde")
    expect(markup).toContain("Ascendant in Virgo, 26°")
    expect(markup).toContain("Midheaven in Gemini, 25°")
  })

  it("lists transits and aspects on their tabs", () => {
    expect(view({ initialTab: "transits" })).toContain("Saturn square your Moon, orb 0.4°, through your 7th house")
    expect(view({ initialTab: "aspects" })).toContain("Sun conjunction Mercury, orb 1.3°")
  })

  it("shows the selected planet as text and suggests a question about it", () => {
    const markup = view({ initialSelected: "moon" })
    expect(markup).toContain("Moon in Taurus, 15°, 2nd house")
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain("What does Moon in Taurus mean?")
  })
})

describe("marker spreading", () => {
  it("keeps markers at least 13° apart so none overlap", () => {
    const shown = markerLongitudes([286, 290, 308, 14])
    const sorted = [...shown].sort((a, b) => a - b)
    for (let index = 1; index < sorted.length; index++) expect(sorted[index]! - sorted[index - 1]!).toBeGreaterThanOrEqual(13)
  })
})
