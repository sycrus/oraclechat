import { describe, expect, it } from "vitest"
import { parseLinks, parseSearchResults, parseSources } from "./search"

describe("web search result parsing", () => {
  it("keeps valid http and https results", () => {
    const results = [
      { title: "A", url: "https://example.com/a", description: "About A" },
      { title: "B", url: "http://example.com/b", description: "" },
    ]
    expect(parseSearchResults(results)).toEqual(results)
  })

  it("drops results with unsafe URLs, missing fields or the wrong shape", () => {
    expect(parseSearchResults([
      { title: "X", url: "javascript:alert(1)", description: "x" },
      { title: "Y", url: "data:text/html,hi", description: "y" },
      { title: "Z", description: "z" },
      { url: "https://example.com", description: "no title" },
      "nope",
      null,
      { title: "OK", url: "https://example.com/ok", description: "fine" },
    ])).toEqual([{ title: "OK", url: "https://example.com/ok", description: "fine" }])
  })

  it("caps the list at five and tolerates non-arrays", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `T${i}`, url: `https://example.com/${i}`, description: "" }))
    expect(parseSearchResults(many)).toHaveLength(5)
    expect(parseSearchResults(undefined)).toEqual([])
    expect(parseSearchResults({ not: "an array" })).toEqual([])
  })
})

describe("message sources", () => {
  const result = { title: "Full moon", url: "https://example.com/moon", description: "Dates." }

  it("reads a teller's lookup with its query", () => {
    expect(parseSources({ query: "full moon", results: [result] })).toEqual({ query: "full moon", results: [result] })
    expect(parseSources({ query: "news", results: [], error: "Web search is unavailable" })).toEqual({ query: "news", results: [], error: "Web search is unavailable" })
  })

  it("still reads the plain result list saved on older user messages", () => {
    expect(parseSources([result])).toEqual({ results: [result] })
  })

  it("ignores missing or malformed sources", () => {
    expect(parseSources(undefined)).toBeUndefined()
    expect(parseSources([])).toBeUndefined()
    expect(parseSources({ query: 3, results: "x" })).toBeUndefined()
  })
})

describe("pasted link parsing", () => {
  it("keeps read and failed links with http(s) URLs, at most two", () => {
    expect(parseLinks([
      { url: "https://a.example/x", title: "A page" },
      { url: "javascript:alert(1)", title: "bad" },
      { url: "http://localhost:4000", error: "Couldn't open" },
      { url: "https://c.example" },
      { url: "https://d.example", title: "Too many" },
    ])).toEqual([
      { url: "https://a.example/x", title: "A page" },
      { url: "http://localhost:4000", error: "Couldn't open" },
    ])
    expect(parseLinks(undefined)).toEqual([])
  })
})
