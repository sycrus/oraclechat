import React from "react"
import { pixelTarot } from "../lib/pixel-tarot"
import { PixelGrid } from "./pixel-grid"

/**
 * A tarot card's face as pixel art (interface-design: Limited palette): the same 24×36 cards as the call, so a reading
 * looks alike in the chat and on a call. Reversed cards are drawn upside down.
 */
export function TarotArtwork({ name, artKey, reversed }: { name: string; artKey: string; reversed: boolean }) {
  return <PixelGrid art={pixelTarot(artKey)} label={`${name} original Oracle illustration`} className={`tarot-art${reversed ? " art-reversed" : ""}`} />
}
