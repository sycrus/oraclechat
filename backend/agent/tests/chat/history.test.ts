import { describe, expect, it } from "vitest"
import { HISTORY_OMITTED, boundHistory, estimateTokens } from "../../src/chat/history.js"

describe("boundHistory", () => {
  const line = (n: number) => `User: message ${n} ${"x".repeat(36)}` // ~12 tokens each

  it("keeps everything, with no marker, when it fits", () => {
    const lines = [line(1), line(2)]
    expect(boundHistory(lines, 1000)).toEqual(lines)
  })

  it("keeps the newest lines within the budget and marks the omission", () => {
    const lines = Array.from({ length: 10 }, (_, index) => line(index + 1))
    const kept = boundHistory(lines, 40)
    expect(kept[0]).toBe(HISTORY_OMITTED)
    expect(kept.at(-1)).toBe(line(10))
    expect(kept).not.toContain(line(1))
    expect(kept.slice(1).reduce((sum, entry) => sum + estimateTokens(entry), 0)).toBeLessThanOrEqual(40)
  })

  it("always keeps the newest line even when it alone exceeds the budget", () => {
    const huge = `User: ${"y".repeat(400)}`
    expect(boundHistory([line(1), huge], 10)).toEqual([HISTORY_OMITTED, huge])
  })
})
