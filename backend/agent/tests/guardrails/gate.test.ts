import { describe, expect, it } from "vitest"
import { SentenceGate } from "../../src/guardrails/gate.js"
import { GuardrailError, type SentenceVerdict } from "../../src/guardrails/types.js"
import type { SpokenSentence } from "../../src/chat/spoken.js"

const s = (text: string): SpokenSentence => ({ text, expression: "neutral" })

/** A check whose verdicts the test settles by hand, in any order. */
function manualCheck() {
  const pending: Array<{ sentence: string; replySoFar: string; settle: (verdict: SentenceVerdict | Error) => void }> = []
  const check = (sentence: string, replySoFar: string) => new Promise<SentenceVerdict>((resolve, reject) => {
    pending.push({ sentence, replySoFar, settle: (verdict) => verdict instanceof Error ? reject(verdict) : resolve(verdict) })
  })
  return { check, pending }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("sentence gate", () => {
  it("starts every check at once and releases sentences in order, even when checks finish out of order", async () => {
    const { check, pending } = manualCheck()
    const released: string[] = []
    const gate = new SentenceGate({ check, release: (sentence) => released.push(sentence.text), abort: () => { throw new Error("no abort expected") } })

    gate.push(s("One."))
    gate.push(s("Two."))
    gate.push(s("Three."))
    expect(pending.map((item) => [item.sentence, item.replySoFar])).toEqual([["One.", ""], ["Two.", "One."], ["Three.", "One. Two."]])

    pending[2]!.settle({ outcome: "pass" })
    pending[1]!.settle({ outcome: "pass" })
    await tick()
    expect(released).toEqual([])
    pending[0]!.settle({ outcome: "pass" })

    expect(await gate.finish()).toEqual({ released: [s("One."), s("Two."), s("Three.")], outcome: "pass" })
    expect(released).toEqual(["One.", "Two.", "Three."])
  })

  it("on the first failure aborts the stream and releases nothing after it", async () => {
    const { check, pending } = manualCheck()
    const released: string[] = []
    let aborts = 0
    const gate = new SentenceGate({ check, release: (sentence) => released.push(sentence.text), abort: () => { aborts += 1 } })

    gate.push(s("The cards lean your way."))
    gate.push(s("Take one step."))
    gate.push(s("The relationship is doomed."))
    pending.forEach((item, index) => item.settle(index === 2 ? { outcome: "fail", check: "ethics", category: "fatalism" } : { outcome: "pass" }))
    await tick()
    gate.push(s("Nothing will save it."))

    expect(await gate.finish()).toEqual({ released: [s("The cards lean your way."), s("Take one step.")], outcome: "cut" })
    expect(released).toEqual(["The cards lean your way.", "Take one step."])
    expect(aborts).toBe(1)
    expect(pending).toHaveLength(3)
  })

  it("releases nothing when the first sentence fails", async () => {
    const { check, pending } = manualCheck()
    const released: string[] = []
    const gate = new SentenceGate({ check, release: (sentence) => released.push(sentence.text), abort: () => undefined })
    gate.push(s("You will never recover."))
    gate.push(s("Fine."))
    pending[1]!.settle({ outcome: "pass" })
    pending[0]!.settle({ outcome: "fail", check: "ethics", category: "fatalism" })

    expect(await gate.finish()).toEqual({ released: [], outcome: "cut" })
    expect(released).toEqual([])
  })

  it("fails closed: a check error aborts, releases nothing after it, and rejects finish()", async () => {
    const { check, pending } = manualCheck()
    const released: string[] = []
    let aborts = 0
    const gate = new SentenceGate({ check, release: (sentence) => released.push(sentence.text), abort: () => { aborts += 1 } })
    gate.push(s("One."))
    gate.push(s("Two."))
    gate.push(s("Three."))
    pending[0]!.settle({ outcome: "pass" })
    pending[1]!.settle({ outcome: "pass" })
    pending[2]!.settle(new GuardrailError("timed out"))

    await expect(gate.finish()).rejects.toBeInstanceOf(GuardrailError)
    expect(released).toEqual(["One.", "Two."])
    expect(aborts).toBe(1)
  })

  it("passes an empty reply through", async () => {
    const gate = new SentenceGate({ check: async () => ({ outcome: "pass" }), release: () => undefined, abort: () => undefined })
    expect(await gate.finish()).toEqual({ released: [], outcome: "pass" })
  })
})
