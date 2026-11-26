import { describe, expect, it } from "vitest"
import { bubbleRandom, nextReveal, paceView, typingDelayMs, type LiveReply } from "./typing-pace"

const low = () => 0
const high = () => 0.999999
const mid = () => 0.5

describe("typingDelayMs (chat spec: Paced reply reveal)", () => {
  it("takes longer for longer bubbles", () => {
    expect(typingDelayMs("x".repeat(120), mid)).toBeGreaterThan(typingDelayMs("x".repeat(20), mid))
  })

  it("stays between 1 and 6 seconds whatever the length or randomness", () => {
    for (const text of ["Hi.", "x".repeat(40), "x".repeat(150), "x".repeat(2000)]) {
      for (const random of [low, mid, high]) {
        const delay = typingDelayMs(text, random)
        expect(delay).toBeGreaterThanOrEqual(1000)
        expect(delay).toBeLessThanOrEqual(6000)
      }
    }
    expect(typingDelayMs("x".repeat(2000), low)).toBe(6000)
    expect(typingDelayMs("Hi.", low)).toBe(1000)
  })

  it("varies with randomness for the same bubble", () => {
    expect(typingDelayMs("x".repeat(40), high)).toBeGreaterThan(typingDelayMs("x".repeat(40), low))
  })
})

const reply = (id: string, paragraphs: string[], complete: boolean): LiveReply => ({ id, content: paragraphs.join("\n\n"), complete })

describe("paceView", () => {
  it("shows every bubble of a finished reply", () => {
    expect(paceView([reply("a", ["One.", "Two."], true)], { a: 2 })).toEqual({ a: { bubbles: 2, typing: false, hidden: false } })
  })

  it("shows the bubbles revealed so far, typing, and hides the replies after it", () => {
    const view = paceView([reply("a", ["One.", "Two.", "Three."], true), reply("b", ["Other."], true)], { a: 1 })
    expect(view["a"]).toEqual({ bubbles: 1, typing: true, hidden: false })
    expect(view["b"]).toEqual({ bubbles: 0, typing: false, hidden: true })
  })

  it("shows only typing dots before the first bubble", () => {
    expect(paceView([reply("a", ["One."], false)], {})).toEqual({ a: { bubbles: 0, typing: true, hidden: false } })
  })

  it("treats a complete reply with no text as finished", () => {
    expect(paceView([{ id: "a", content: "", complete: true }], {})).toEqual({ a: { bubbles: 0, typing: false, hidden: false } })
  })

  it("moves on to the next reply once the first is finished", () => {
    const view = paceView([reply("a", ["One."], true), reply("b", ["Other.", "More."], false)], { a: 1 })
    expect(view["b"]).toEqual({ bubbles: 0, typing: true, hidden: false })
  })
})

describe("nextReveal", () => {
  it("does not reveal a paragraph that may still be growing", () => {
    expect(nextReveal([reply("a", ["Still writ"], false)], {}, 0, low)).toBeNull()
  })

  it("reveals a paragraph once a later one has started, after its typing delay", () => {
    const next = nextReveal([reply("a", ["First paragraph.", "Sec"], false)], {}, 5000, low)
    expect(next).toEqual({ id: "a", index: 0, at: 5000 + typingDelayMs("First paragraph.", low) })
  })

  it("reveals the last paragraph once the reply is complete", () => {
    const next = nextReveal([reply("a", ["One.", "Two."], true)], { a: 1 }, 100, low)
    expect(next).toEqual({ id: "a", index: 1, at: 100 + typingDelayMs("Two.", low) })
  })

  it("makes the second reply wait for the first", () => {
    const replies = [reply("a", ["One.", "Two."], true), reply("b", ["Other."], true)]
    expect(nextReveal(replies, { a: 1 }, 0, low)?.id).toBe("a")
    expect(nextReveal(replies, { a: 2 }, 0, low)).toMatchObject({ id: "b", index: 0 })
  })

  it("has nothing to reveal when everything is shown", () => {
    expect(nextReveal([reply("a", ["One."], true)], { a: 1 }, 0, low)).toBeNull()
  })

  it("draws each bubble's randomness from the reply and bubble, so its time stays put across renders", () => {
    const replies = [reply("msg-1", ["A paragraph of some length here.", "Next."], true)]
    expect(nextReveal(replies, {}, 0, bubbleRandom)).toEqual(nextReveal(replies, {}, 0, bubbleRandom))
  })
})

describe("bubbleRandom", () => {
  it("is the same for the same bubble, in [0, 1), and differs between bubbles", () => {
    expect(bubbleRandom("msg-1", 0)).toBe(bubbleRandom("msg-1", 0))
    const values = ["msg-1:0", "msg-1:1", "msg-2:0", "abc:3"].map((key) => { const [id, index] = key.split(":"); return bubbleRandom(id!, Number(index)) })
    for (const value of values) { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1) }
    expect(new Set(values).size).toBe(values.length)
  })
})
