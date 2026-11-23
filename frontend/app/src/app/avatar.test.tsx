import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CALL_PALETTE } from "../lib/call/palette"
import { PROFILE_ART } from "../lib/profile-art"
import { ConversationAvatar, TellerAvatar } from "./avatar"

const TELLERS = ["mira-the-mystic", "sage-the-seer", "astra-the-astrologer"]

describe("teller profile pictures", () => {
  it("gives every chat teller a 24×24 picture in call palette colours only", () => {
    for (const id of TELLERS) {
      const art = PROFILE_ART[id]!
      expect(art.rows).toHaveLength(24)
      for (const row of art.rows) expect(row).toHaveLength(24)
      const used = new Set(art.rows.join("").replace(/\./g, ""))
      for (const key of used) expect(CALL_PALETTE).toContain(art.colours[key])
    }
  })

  it("draws the picture with square edges inside the stepped avatar", () => {
    const markup = renderToStaticMarkup(<TellerAvatar tellerId="mira-the-mystic" />)
    expect(markup).toContain('class="avatar avatar-art avatar-52"')
    expect(markup).toContain('viewBox="0 0 24 24"')
    expect(markup).toContain('shape-rendering="crispEdges"')
  })

  it("gives each teller a different picture", () => {
    const pictures = TELLERS.map((id) => renderToStaticMarkup(<TellerAvatar tellerId={id} />))
    expect(new Set(pictures).size).toBe(3)
  })

  it("shows both pictures in a group", () => {
    const markup = renderToStaticMarkup(<ConversationAvatar tellerIds={["mira-the-mystic", "sage-the-seer"]} />)
    expect(markup.match(/viewBox="0 0 24 24"/g)).toHaveLength(2)
  })

  it("falls back to a pixel icon for a teller without a picture", () => {
    const markup = renderToStaticMarkup(<TellerAvatar tellerId="someone-new" />)
    expect(markup).toContain('viewBox="0 0 16 16"')
  })
})
