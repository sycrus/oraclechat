import { describe, expect, it } from "vitest"
import { frameHead, isHeadVertex } from "./framing"

const FOV = 24
const visibleHeight = (distance: number) => 2 * distance * Math.tan((FOV * Math.PI) / 360)
const frameTop = (f: { y: number; distance: number }) => f.y + visibleHeight(f.distance) / 2
const frameBottom = (f: { y: number; distance: number }) => f.y - visibleHeight(f.distance) / 2

// Measured from the models (rest pose, metres): the VRoid sample and voxel Moon Girl.
const vroid = { top: 1.615, base: 1.386, width: 0.25, centerX: 0, centerZ: -0.015 }
const mascot = { top: 1.951, base: 1.339, width: 0.677, centerX: 0, centerZ: 0.004 }
// A head posed off to one side.
const offside = { top: 1.56, base: 1.26, width: 0.29, centerX: -0.1, centerZ: 0.03 }

describe("frameHead", () => {
  it("keeps a VRoid human's framing close to the old fixed 0.68 m view", () => {
    const f = frameHead(vroid, FOV, 0.8)!
    expect(visibleHeight(f.distance)).toBeGreaterThan(0.68 * 0.9)
    expect(visibleHeight(f.distance)).toBeLessThan(0.68 * 1.1)
  })

  it("shows the whole head in the upper part of the frame", () => {
    for (const head of [vroid, mascot]) {
      const f = frameHead(head, FOV, 0.8)!
      expect(frameTop(f)).toBeGreaterThan(head.top)
      expect(head.base).toBeGreaterThan(f.y)
      expect(head.base).toBeGreaterThan(frameBottom(f))
    }
  })

  it("pulls back for a large mascot head", () => {
    expect(frameHead(mascot, FOV, 0.8)!.distance).toBeGreaterThan(frameHead(vroid, FOV, 0.8)!.distance * 2)
  })

  it("pulls back further when a wide head would not fit a narrow window", () => {
    const wide = { ...vroid, width: 0.6 }
    expect(frameHead(wide, FOV, 0.4)!.distance).toBeGreaterThan(frameHead(wide, FOV, 1.6)!.distance)
  })

  it("on a phone, lets a wide head nearly fill the width instead of pulling back to show the body below the waist", () => {
    const wide = { ...vroid, width: 0.6 }
    const f = frameHead(wide, FOV, 0.46)!
    expect(visibleHeight(f.distance) * 0.46).toBeLessThanOrEqual(wide.width * 1.15)
    expect(visibleHeight(f.distance) * 0.46).toBeGreaterThanOrEqual(wide.width)
  })

  it("centres on the head's depth", () => {
    expect(frameHead(mascot, FOV, 1)!.centerZ).toBe(0.004)
  })

  it("centres horizontally on the head", () => {
    expect(frameHead(offside, FOV, 1)!.x).toBe(-0.1)
    expect(frameHead(vroid, FOV, 1)!.x).toBe(0)
  })

  it("gives up when the head has no height", () => {
    expect(frameHead({ ...vroid, top: vroid.base }, FOV, 1)).toBeNull()
  })
})

describe("isHeadVertex", () => {
  const head = new Set([5, 9])

  it("picks a vertex whose strongest weight is a head bone", () => {
    expect(isHeadVertex([9, 2, 0, 0], [0.7, 0.3, 0, 0], head)).toBe(true)
  })

  it("skips a vertex dominated by another bone", () => {
    expect(isHeadVertex([5, 2, 0, 0], [0.4, 0.6, 0, 0], head)).toBe(false)
  })

  it("uses the first of tied weights", () => {
    expect(isHeadVertex([5, 2, 0, 0], [0.5, 0.5, 0, 0], head)).toBe(true)
    expect(isHeadVertex([2, 5, 0, 0], [0.5, 0.5, 0, 0], head)).toBe(false)
  })

  it("skips an unweighted vertex", () => {
    expect(isHeadVertex([5, 0, 0, 0], [0, 0, 0, 0], head)).toBe(false)
  })
})

