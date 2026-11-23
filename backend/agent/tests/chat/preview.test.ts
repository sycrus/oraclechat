import { describe, expect, it } from "vitest"
import { previewText } from "../../src/chat/preview.js"

describe("previewText", () => {
  it("strips emphasis and joins paragraphs", () => {
    expect(previewText("**The Star**, upright.\n\nHope returns.")).toBe("The Star, upright. Hope returns.")
  })

  it("strips headings, list markers, inline code and links", () => {
    expect(previewText("## Past\n- _Seven_ of `Cups`\n1. see [the card](https://example.com)")).toBe("Past Seven of Cups see the card")
  })

  it("cuts long text to 80 characters with an ellipsis", () => {
    const preview = previewText("word ".repeat(40))
    expect(preview.length).toBe(80)
    expect(preview.endsWith("…")).toBe(true)
  })

  it("keeps short text whole", () => {
    expect(previewText("  Hello   there  ")).toBe("Hello there")
  })
})
