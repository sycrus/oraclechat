import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { TarotArtwork } from "./tarot-artwork"

describe("pixel tarot artwork", () => {
  it("draws the card as square-edged pixel art and labels it", () => {
    const markup = renderToStaticMarkup(<TarotArtwork name="The Fool" artKey="major-0" reversed={false} />)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="The Fool original Oracle illustration"')
    expect(markup).toContain('viewBox="0 0 24 36"')
    expect(markup).toContain('shape-rendering="crispEdges"')
  })

  it("uses distinct Major Arcana scenes and marks reversed artwork", () => {
    const fool = renderToStaticMarkup(<TarotArtwork name="The Fool" artKey="major-0" reversed={false} />)
    const star = renderToStaticMarkup(<TarotArtwork name="The Star" artKey="major-17" reversed />)
    expect(fool).not.toBe(star)
    expect(star).toContain("art-reversed")
  })

  it("provides a distinct symbolic scene for every Major Arcana card", () => {
    const scenes = Array.from({ length: 22 }, (_, index) => renderToStaticMarkup(
      <TarotArtwork name={`Card ${index}`} artKey={`major-${index}`} reversed={false} />,
    ).replace(/aria-label="[^"]+"/, 'aria-label="card"'))
    expect(new Set(scenes).size).toBe(22)
  })

  it("distinguishes the four Minor Arcana court ranks", () => {
    const ranks = ["page", "knight", "queen", "king"]
    const scenes = ranks.map((rank) => renderToStaticMarkup(
      <TarotArtwork name={rank} artKey={`wands-${rank}`} reversed={false} />,
    ).replace(/aria-label="[^"]+"/, 'aria-label="card"'))
    expect(new Set(scenes).size).toBe(4)
  })
})
