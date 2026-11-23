import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const read = (name: string) => readFileSync(join(__dirname, name), "utf8")

// ADR-0019: the interface palette. Nothing else may appear as a colour literal.
const PALETTE = ["#0b1028", "#121a3d", "#1c2752", "#2a3768", "#2d4a8c", "#5b6488", "#8c93b0", "#d4d8e4", "#f0f2f8", "#e8c35a", "#d9534f"]

describe("design tokens", () => {
  const css = read("globals.css").replace(/\/\*[\s\S]*?\*\//g, "")

  it("uses only palette colours", () => {
    const literals = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    expect(literals.length).toBeGreaterThan(0)
    expect(literals.map((value) => value.toLowerCase()).filter((value) => !PALETTE.includes(value))).toEqual([])
  })

  it("has no gradients-as-shading, blur, colour functions or soft shadows", () => {
    expect(css).not.toMatch(/linear-gradient|radial-gradient|blur\(|rgba?\(|hsla?\(|drop-shadow/)
    // Box shadows are allowed only as one hard, zero-blur inset or offset.
    for (const shadow of css.match(/box-shadow:[^;}]+/g) ?? []) expect(shadow.trim()).toMatch(/^box-shadow:\s*(none|(inset\s+)?-?\d+(px)?\s+-?\d+(px)?\s+0(\s+-?\d+px)?\s+[^\s,]+)$/)
  })

  it("keeps a teller avatar visible on a selected row", () => {
    // .avatar-1 is var(--raised), the selected row's background.
    expect(css).toMatch(/\.chat-row\[aria-current\] \.avatar-1\s*\{[^}]*background:\s*var\(--line\)/)
  })

  it("loads fonts from bundled files only", () => {
    const layout = read("layout.tsx")
    expect(layout).toContain("next/font/local")
    expect(layout).not.toContain("next/font/google")
    expect(css).not.toMatch(/fonts\.googleapis|@import\s+url/)
  })
})
