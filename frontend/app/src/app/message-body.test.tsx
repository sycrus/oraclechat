import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CLEAR_HISTORY_CONFIRM, Composer, LinkList, MessageBubbles, modelStatusLabel, SearchSources, SignatureCardView, isAwaitingTeller, positionLabel, splitParagraphs, thinkingLabel } from "./message-body"

describe("teller reply presentation", () => {
  it("splits a reply into paragraphs on blank lines and drops empty ones", () => {
    expect(splitParagraphs("First.\n\nSecond line\nstill second.\n\n\n\nThird.\n\n")).toEqual([
      "First.", "Second line\nstill second.", "Third.",
    ])
    expect(splitParagraphs("")).toEqual([])
  })

  it("renders one bubble per paragraph with the byline only on the first", () => {
    const markup = renderToStaticMarkup(
      <MessageBubbles content={"One.\n\nTwo.\n\nThree."} byline={<span className="byline">Mira</span>} />,
    )
    expect(markup.match(/class="message-bubble"/g)).toHaveLength(3)
    expect(markup.match(/class="byline"/g)).toHaveLength(1)
    expect(markup.indexOf("byline")).toBeLessThan(markup.indexOf("One."))
  })

  it("puts the tail only on the first bubble of a run", () => {
    const first = renderToStaticMarkup(<MessageBubbles content={"One.\n\nTwo."} tail />)
    expect(first.match(/message-bubble tail/g)).toHaveLength(1)
    const later = renderToStaticMarkup(<MessageBubbles content={"One.\n\nTwo."} />)
    expect(later).not.toContain("tail")
  })

  it("adds the time and meta to the last bubble only", () => {
    const markup = renderToStaticMarkup(<MessageBubbles content={"One.\n\nTwo."} meta={<span className="meta">21:14</span>} />)
    expect(markup.match(/class="meta"/g)).toHaveLength(1)
    expect(markup.indexOf("meta")).toBeGreaterThan(markup.indexOf("Two."))
  })

  it("renders Markdown emphasis without the asterisks", () => {
    const markup = renderToStaticMarkup(<MessageBubbles content="**Past: Seven of Cups**" />)
    expect(markup).toContain("<strong>Past: Seven of Cups</strong>")
    expect(markup).not.toContain("**")
  })

  it("does not render raw HTML from a reply", () => {
    const markup = renderToStaticMarkup(<MessageBubbles content={'Hi <script>alert(1)</script> <img src=x onerror="x()">'} />)
    expect(markup).not.toContain("<script")
    expect(markup).not.toContain("<img")
  })
})

describe("thinking indicator", () => {
  it("shows before any reply starts", () => {
    expect(isAwaitingTeller({ busy: true, streaming: false, completed: 0, expected: 2 })).toBe(true)
  })

  it("hides while a reply is streaming", () => {
    expect(isAwaitingTeller({ busy: true, streaming: true, completed: 0, expected: 2 })).toBe(false)
  })

  it("shows again between the first and second teller", () => {
    expect(isAwaitingTeller({ busy: true, streaming: false, completed: 1, expected: 2 })).toBe(true)
  })

  it("hides once every expected teller has completed or nothing is pending", () => {
    expect(isAwaitingTeller({ busy: true, streaming: false, completed: 2, expected: 2 })).toBe(false)
    expect(isAwaitingTeller({ busy: false, streaming: false, completed: 0, expected: 2 })).toBe(false)
  })
})

describe("signature card", () => {
  const card = { position: "shadow" as const, name: "The Moon", orientation: "reversed" as const, artKey: "major-18", meaning: "Something is surfacing." }

  it("labels the card by its niche and shows name and orientation", () => {
    const markup = renderToStaticMarkup(<SignatureCardView card={card} expanded={false} onToggle={() => undefined} />)
    expect(markup).toContain("Shadow card")
    expect(markup).toContain("The Moon")
    expect(markup).toContain("reversed")
    expect(markup).not.toContain("Something is surfacing.")
  })

  it("shows the meaning when expanded", () => {
    const markup = renderToStaticMarkup(<SignatureCardView card={{ ...card, position: "action" }} expanded onToggle={() => undefined} />)
    expect(markup).toContain("Action card")
    expect(markup).toContain("Something is surfacing.")
  })
})

describe("readings and sources", () => {
  it("offers only a message box and a send button in the composer", () => {
    const markup = renderToStaticMarkup(<Composer draft="Mira, read for me" busy={false} onDraft={() => undefined} onSubmit={() => undefined} />)
    expect(markup).toContain("<textarea")
    expect(markup).toContain('aria-label="Send message"')
    expect(markup).not.toContain("<select")
    expect(markup).not.toContain('type="checkbox"')
    expect(markup).not.toContain("Search the web")
  })

  it("renders a teller's lookup as safe source links under its query, and the unavailable note", () => {
    const markup = renderToStaticMarkup(<SearchSources query="mercury retrograde 2026" results={[{ title: "Mercury retrograde explained", url: "https://example.com/m", description: "What it means." }]} />)
    expect(markup).toContain("Looked up")
    expect(markup).toContain("mercury retrograde 2026")
    expect(markup).toContain('href="https://example.com/m"')
    expect(markup).toContain('rel="noopener noreferrer"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain("Mercury retrograde explained")
    expect(renderToStaticMarkup(<SearchSources query="news" results={[]} error="Web search is unavailable" />)).toContain("Web search was unavailable")
    expect(renderToStaticMarkup(<SearchSources results={[{ title: "Old", url: "https://example.com/o", description: "" }]} />)).toContain("Sources")
    expect(renderToStaticMarkup(<SearchSources results={[]} />)).toBe("")
  })

  it("lists pasted links that were read, and the ones that couldn't be opened", () => {
    const markup = renderToStaticMarkup(<LinkList links={[{ url: "https://a.example/x", title: "A page" }, { url: "http://localhost:4000", error: "Couldn't open" }]} />)
    expect(markup).toContain('href="https://a.example/x"')
    expect(markup).toContain("A page")
    expect(markup).toContain('rel="noopener noreferrer"')
    expect(markup).toContain("Couldn&#x27;t open")
    expect(markup).toContain("http://localhost:4000")
    expect(renderToStaticMarkup(<LinkList links={[]} />)).toBe("")
  })

  it("labels spread positions without hyphens", () => {
    expect(positionLabel("hopes-fears")).toBe("hopes fears")
    expect(positionLabel("past")).toBe("past")
  })

  it("says the tellers are thinking", () => {
    expect(thinkingLabel({ tellerCount: 2, completed: 0 })).toBe("Your tellers are thinking")
    expect(thinkingLabel({ tellerCount: 2, completed: 1 })).toBe("Thinking")
    expect(thinkingLabel({ tellerCount: 1, completed: 0 })).toBe("Thinking")
  })
})

describe("clear chat history", () => {
  it("confirms that memories are kept", () => {
    expect(CLEAR_HISTORY_CONFIRM).toBe("Delete all conversations? Your saved memories are kept.")
  })
})

describe("model status", () => {
  it("says whether teller replies are local or hosted", () => {
    expect(modelStatusLabel(false)).toBe("Local models")
    expect(modelStatusLabel(true)).toBe("Hosted model")
  })
})
