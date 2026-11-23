import { describe, expect, it } from "vitest"
import { CALL_PALETTE, hexToRgb, nearestColour, snapFrame } from "./palette"

describe("call palette", () => {
  it("has sixteen distinct colours", () => {
    expect(CALL_PALETTE).toHaveLength(16)
    expect(new Set(CALL_PALETTE).size).toBe(16)
  })

  it("maps every palette colour to itself", () => {
    for (const colour of CALL_PALETTE) expect(nearestColour(hexToRgb(colour))).toBe(colour)
  })

  it("picks the nearer of two colours", () => {
    // Slightly nearer white (#f0f2f8) than gray (#d4d8e4).
    expect(nearestColour([232, 235, 242])).toBe("#f0f2f8")
    expect(nearestColour([0, 0, 0])).toBe("#0b1028")
  })
})

describe("snapFrame", () => {
  it("snaps each pixel to the palette and flips WebGL's bottom-up rows", () => {
    // 1×2 frame, bottom row first as readPixels returns it: bottom near-white, top near-black.
    const source = new Uint8Array([232, 235, 242, 255, 5, 5, 5, 255])
    const target = new Uint8ClampedArray(8)
    snapFrame(source, 1, 2, target)
    expect([...target.slice(0, 4)]).toEqual([...hexToRgb("#0b1028"), 255])
    expect([...target.slice(4, 8)]).toEqual([...hexToRgb("#f0f2f8"), 255])
  })

  it("leaves mostly transparent pixels transparent", () => {
    const target = new Uint8ClampedArray(4)
    snapFrame(new Uint8Array([200, 10, 10, 40]), 1, 1, target)
    expect(target[3]).toBe(0)
  })
})
