import { parseAstrologyReading, type AstrologyReading } from "../astrology"
import { parseBirthForm } from "../birth-form"
import { parseCardFan, type CardFan } from "../fan"
import { parseIChingReading, type IChingReading } from "../iching"
import { parseSignatureCard, parseTarotSpread, type SignatureCard, type TarotSpread } from "../tarot"
import { parseTossInteraction, type CoinToss } from "../toss"

export interface CallCards { spread: TarotSpread; signature?: SignatureCard }

/** What the call shows for a reading drawn in a call turn: the tarot cards, or a note pointing to the chat. */
export function readingDisplay(name: string, reading: unknown, card: unknown): { cards: CallCards } | { note: string } {
  const spread = parseTarotSpread(reading)
  if (spread) {
    const signature = parseSignatureCard(card)
    return { cards: { spread, ...(signature ? { signature } : {}) } }
  }
  const total = ((reading as { cards?: unknown[] } | undefined)?.cards?.length ?? 0) + (card ? 1 : 0)
  return { note: total ? `${name} drew ${total} card${total === 1 ? "" : "s"} — see chat` : `${name} gave a reading — see chat` }
}

/** What the call's message panel shows for a message from a call turn (ADR-0020), or null for none. */
export type CallPanelContent =
  | { kind: "fan"; fan: CardFan }
  | { kind: "toss"; toss: CoinToss }
  | { kind: "form"; state: "open" | "submitted" }
  | { kind: "cards"; cards: CallCards }
  | { kind: "iching"; reading: IChingReading }
  | { kind: "chart"; reading: AstrologyReading }
  | { kind: "note"; note: string }

export function callPanel(name: string, message: { interaction?: unknown; reading?: unknown; signatureCard?: unknown }): CallPanelContent | null {
  const fan = parseCardFan(message.interaction)
  const toss = parseTossInteraction(message.interaction)
  const form = parseBirthForm(message.interaction)
  if ((fan ?? toss ?? form)?.state === "set-aside") return null
  if (fan?.state === "open") return { kind: "fan", fan }
  if (toss?.state === "casting") return { kind: "toss", toss }
  if (form?.state === "open") return { kind: "form", state: "open" }
  if (message.reading === undefined || message.reading === null) return null
  const iching = parseIChingReading(message.reading)
  if (iching) return { kind: "iching", reading: iching }
  const chart = parseAstrologyReading(message.reading)
  if (chart) return { kind: "chart", reading: chart }
  const display = readingDisplay(name, message.reading, message.signatureCard)
  return "cards" in display ? { kind: "cards", cards: display.cards } : { kind: "note", note: display.note }
}
