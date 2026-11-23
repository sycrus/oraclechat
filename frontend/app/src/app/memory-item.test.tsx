import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { MemoryItem, nextKind } from "./memory-item"

const noop = () => undefined

describe("memory item", () => {
  it("shows entity tags as chips, naming tellers by display name", () => {
    const markup = renderToStaticMarkup(<MemoryItem memory={{ id: "m1", content: "Promised Mira to apply", kind: "detail", entities: ["ana", "mira-the-mystic"] }} onPin={noop} onEdit={noop} onDelete={noop} />)
    expect(markup).toContain(">ana<")
    expect(markup).toContain(">Mira<")
    expect(markup).not.toContain("mira-the-mystic<")
  })

  it("marks pinned memories and offers to unpin them", () => {
    const pinned = renderToStaticMarkup(<MemoryItem memory={{ id: "m1", content: "Name is Jo", kind: "core", entities: [] }} onPin={noop} onEdit={noop} onDelete={noop} />)
    expect(pinned).toContain('aria-pressed="true"')
    expect(pinned).toContain("Unpin")
    const detail = renderToStaticMarkup(<MemoryItem memory={{ id: "m2", content: "Likes tea", kind: "detail", entities: [] }} onPin={noop} onEdit={noop} onDelete={noop} />)
    expect(detail).toContain('aria-pressed="false"')
  })

  it("toggles between core and detail", () => {
    expect(nextKind("core")).toBe("detail")
    expect(nextKind("detail")).toBe("core")
  })
})
