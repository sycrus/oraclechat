import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ICONS, Icon, type IconName } from "./icons"

describe("pixel icons", () => {
  it("draws every icon on a 16×16 grid with square edges, hidden from assistive technology", () => {
    for (const name of Object.keys(ICONS) as IconName[]) {
      const markup = renderToStaticMarkup(<Icon name={name} />)
      expect(markup).toContain('viewBox="0 0 16 16"')
      expect(markup).toContain('shape-rendering="crispEdges"')
      expect(markup).toContain('aria-hidden="true"')
      expect(ICONS[name].d).toMatch(/^[MmHhVvLlZz0-9 .-]+$/)
    }
  })

  it("renders at whole multiples of the grid", () => {
    expect(renderToStaticMarkup(<Icon name="search" size={24} />)).toContain('width="24"')
    expect(renderToStaticMarkup(<Icon name="search" size={32} />)).toContain('height="32"')
  })

  it("uses the even-odd rule for icons with holes", () => {
    expect(renderToStaticMarkup(<Icon name="camera" />)).toContain('fill-rule="evenodd"')
    expect(renderToStaticMarkup(<Icon name="search" />)).not.toContain("evenodd")
  })
})
