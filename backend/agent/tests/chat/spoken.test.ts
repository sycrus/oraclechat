import { describe, expect, it } from "vitest"
import { SpokenSplitter, stripTags, type SpokenSentence } from "../../src/chat/spoken.js"

function split(...chunks: string[]): SpokenSentence[] {
  const splitter = new SpokenSplitter()
  return [...chunks.flatMap((chunk) => splitter.push(chunk)), ...splitter.end()]
}

describe("SpokenSplitter", () => {
  it("splits sentences and reads the leading emotion tag", () => {
    expect(split("[happy] Yes, start it. [relaxed] One page is enough for day one.")).toEqual([
      { text: "Yes, start it.", expression: "happy" },
      { text: "One page is enough for day one.", expression: "relaxed" },
    ])
  })

  it("returns a sentence as soon as it is complete", () => {
    const splitter = new SpokenSplitter()
    expect(splitter.push("[surprised] Oh! You")).toEqual([{ text: "Oh!", expression: "surprised" }])
    expect(splitter.push(" again")).toEqual([])
    expect(splitter.end()).toEqual([{ text: "You again", expression: "neutral" }])
  })

  it("handles tags and sentences split across chunks", () => {
    expect(split("[hap", "py] Ye", "s. [s", "ad] Not ", "today.")).toEqual([
      { text: "Yes.", expression: "happy" },
      { text: "Not today.", expression: "sad" },
    ])
  })

  it("ends sentences at ellipses, question marks, closing quotes and newlines", () => {
    expect(split('[relaxed] Well… maybe. Ready? She said "go." Then\nwe start')).toEqual([
      { text: "Well…", expression: "relaxed" },
      { text: "maybe.", expression: "neutral" },
      { text: "Ready?", expression: "neutral" },
      { text: 'She said "go."', expression: "neutral" },
      { text: "Then", expression: "neutral" },
      { text: "we start", expression: "neutral" },
    ])
  })

  it("treats unknown tags as neutral and removes them", () => {
    expect(split("[smug] Told you.")).toEqual([{ text: "Told you.", expression: "neutral" }])
  })

  it("removes known tags in the middle of a sentence", () => {
    expect(split("[happy] Yes [relaxed] really.")).toEqual([{ text: "Yes really.", expression: "happy" }])
  })

  it("drops markdown symbols from the spoken text and skips empty sentences", () => {
    expect(split("[happy] **One** _small_ `step`. [sad] ...")).toEqual([{ text: "One small step.", expression: "happy" }])
  })
})

describe("stripTags", () => {
  it("removes tags but keeps markdown and line breaks", () => {
    expect(stripTags("[happy] **Yes.** [relaxed] Start\n[smug] today.")).toBe("**Yes.** Start\ntoday.")
  })

  it("leaves ordinary brackets alone when they are not leading tags", () => {
    expect(stripTags("The card [reversed] matters.")).toBe("The card [reversed] matters.")
  })
})
