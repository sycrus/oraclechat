import { describe, expect, it } from "vitest"
import { ARM_DOWN, easeToward, orientFor, thinkingPose } from "./pose"

describe("orientFor", () => {
  const angles = { x: 0.1, y: 0.2, z: ARM_DOWN }

  it("leaves VRM 1.0 angles unchanged", () => {
    expect(orientFor(angles, false)).toEqual(angles)
  })

  it("negates X and Z and keeps Y for a VRM 0.x bone, which is turned 180° about Y", () => {
    expect(orientFor(angles, true)).toEqual({ x: -0.1, y: 0.2, z: -ARM_DOWN })
  })
})

describe("easeToward", () => {
  it("moves toward the target without overshooting", () => {
    const step = easeToward(0, 1, 1 / 60)
    expect(step).toBeGreaterThan(0)
    expect(step).toBeLessThan(1)
    expect(easeToward(0.99, 1, 10)).toBeCloseTo(1)
    expect(easeToward(1, 0, 1 / 60)).toBeLessThan(1)
  })

  it("gets most of the way in about 300 ms", () => {
    let value = 0
    for (let frame = 0; frame < 18; frame += 1) value = easeToward(value, 1, 1 / 60)
    expect(value).toBeGreaterThan(0.9)
  })
})

describe("thinkingPose", () => {
  it("is the resting pose at weight 0", () => {
    const rest = thinkingPose(0)
    expect(rest.rightUpperArm).toEqual({ x: 0, y: 0, z: ARM_DOWN })
    expect(rest.rightLowerArm).toEqual({ x: 0, y: 0, z: 0 })
    expect(rest.head).toEqual({ x: 0, y: 0, z: 0 })
    expect(rest.lookUp).toBe(0)
    expect(rest.lookAway).toBe(0)
  })

  it("raises the hand, turns the head and looks away at weight 1", () => {
    const full = thinkingPose(1)
    expect(full.rightLowerArm.y).not.toBe(0)
    expect(Math.abs(full.head.y)).toBeGreaterThan(0.2)
    expect(full.lookUp).toBeGreaterThan(0.3)
    expect(full.lookAway).toBeGreaterThan(0.3)
  })

  it("blends linearly in between", () => {
    const half = thinkingPose(0.5)
    const full = thinkingPose(1)
    expect(half.head.y).toBeCloseTo(full.head.y / 2)
    expect(half.rightUpperArm.z).toBeCloseTo((ARM_DOWN + full.rightUpperArm.z) / 2)
  })
})
