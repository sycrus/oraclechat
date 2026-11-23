import { describe, expect, it } from "vitest"
import { TALK_HOLD_MS, clipFor, nextTalk } from "./clips"

describe("clipFor", () => {
  it("talks while speaking", () => {
    expect(clipFor("speaking", 0, true)).toBe("talk")
  })

  it("keeps talking through a short gap between sentences", () => {
    expect(clipFor("idle", 800, true)).toBe("talk")
    expect(clipFor("idle", TALK_HOLD_MS - 1, true)).toBe("talk")
  })

  it("returns to idle after the hold", () => {
    expect(clipFor("idle", TALK_HOLD_MS, true)).toBe("idle")
    expect(clipFor("idle", Infinity, true)).toBe("idle")
  })

  it("idles while thinking, so the thinking pose blends over the idle clip", () => {
    expect(clipFor("thinking", Infinity, true)).toBe("idle")
  })

  it("idles when there is no talking clip", () => {
    expect(clipFor("speaking", 0, false)).toBe("idle")
  })
})

describe("nextTalk", () => {
  it("never repeats the previous clip when there is a choice", () => {
    const always = (value: number) => () => value
    for (const roll of [0, 0.34, 0.5, 0.99]) {
      expect(nextTalk(3, 1, always(roll))).not.toBe(1)
      expect(nextTalk(3, 1, always(roll))).toBeGreaterThanOrEqual(0)
      expect(nextTalk(3, 1, always(roll))).toBeLessThan(3)
    }
  })

  it("can pick any clip on the first turn", () => {
    expect(nextTalk(3, -1, () => 0)).toBe(0)
    expect(nextTalk(3, -1, () => 0.99)).toBe(2)
  })

  it("uses the only clip when there is one", () => {
    expect(nextTalk(1, 0, () => 0.7)).toBe(0)
  })
})
