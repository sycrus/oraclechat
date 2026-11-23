import { describe, expect, it } from "vitest"
import { mouthOpen } from "./mouth"
import { blinkWeight, breathing, nextBlinkDelay } from "./idle"

describe("mouth follows loudness", () => {
  it("closes on silence and below the noise floor", () => {
    expect(mouthOpen(0, 0.6)).toBeLessThan(0.6)
    let value = 0.8
    for (let frame = 0; frame < 30; frame += 1) value = mouthOpen(0.005, value)
    expect(value).toBe(0)
  })

  it("opens with louder audio and never passes 1", () => {
    const quiet = mouthOpen(0.05, 0)
    const loud = mouthOpen(0.3, 0)
    expect(loud).toBeGreaterThan(quiet)
    expect(mouthOpen(5, 1)).toBe(1)
  })

  it("opens faster than it closes", () => {
    const opened = mouthOpen(0.3, 0)
    const closed = mouthOpen(0, 1)
    expect(opened).toBeGreaterThan(1 - closed)
  })
})

describe("idle motion", () => {
  it("waits 2–6 seconds between blinks", () => {
    expect(nextBlinkDelay(() => 0)).toBe(2000)
    expect(nextBlinkDelay(() => 0.999999)).toBeCloseTo(6000, -1)
  })

  it("closes and reopens the eyes over about 150 ms", () => {
    expect(blinkWeight(0)).toBe(0)
    expect(blinkWeight(75)).toBeCloseTo(1)
    expect(blinkWeight(150)).toBe(0)
    expect(blinkWeight(400)).toBe(0)
    expect(blinkWeight(-10)).toBe(0)
  })

  it("breathes with small, periodic rotations", () => {
    const samples = Array.from({ length: 50 }, (_, index) => breathing(index * 0.1))
    for (const { chest, neck } of samples) {
      expect(Math.abs(chest)).toBeLessThan(0.05)
      expect(Math.abs(neck)).toBeLessThan(0.05)
    }
    expect(new Set(samples.map(({ chest }) => chest.toFixed(4))).size).toBeGreaterThan(10)
  })
})
