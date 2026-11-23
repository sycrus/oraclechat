/** The tarot card fan (ADR-0017): the app shuffles and hides a fan of cards, the user picks, and revealing deals the spread. */
import { randomInt } from "node:crypto"
import { getTarotCardContent, getTarotDeck } from "./catalog.js"
import { drawSignatureCards, SPREAD_POSITIONS, type TarotCardDraw, type TarotSpread, type TarotSpreadType } from "./draw.js"

/** Cards in the fan beyond what the spread needs, so the user has a real choice. */
export const FAN_SPARE_CARDS = 6

/** Server-side state of a fan message. `hidden` holds the fan's cards in order and exists only while the fan is open. */
export interface FanInteraction {
  kind: "card-fan"
  state: "open" | "revealed" | "set-aside"
  spread: TarotSpreadType
  size: number
  /** Indexes into the fan, in the order picked. */
  picks: number[]
  hidden?: FanCard[]
}

export type FanCard = Omit<TarotCardDraw, "position">

/** What the browser may see: everything except the hidden cards. */
export type PublicFan = Omit<FanInteraction, "hidden">

function defaultRandom(): number { return randomInt(0, 0x100000000) / 0x100000000 }

/** Lays out a fan: the spread's positions plus spare cards, shuffled, each with an orientation decided now. */
export function drawFan(spread: TarotSpreadType, random: () => number = defaultRandom): FanInteraction {
  const size = SPREAD_POSITIONS[spread].length + FAN_SPARE_CARDS
  const names = getTarotDeck()
  for (let index = names.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[names[index], names[target]] = [names[target]!, names[index]!]
  }
  const hidden = names.slice(0, size).map((name): FanCard => {
    const content = getTarotCardContent(name)
    const orientation = random() < 0.5 ? "upright" : "reversed"
    return { name, orientation, artKey: content.artKey, meaning: content[orientation] }
  })
  return { kind: "card-fan", state: "open", spread, size, picks: [], hidden }
}

/** Deals the picked cards, in pick order, into the spread's fixed positions, plus the teller's signature card if it has one. */
export function dealFan(
  fan: FanInteraction,
  signaturePosition: "action" | "shadow" | undefined,
  random?: () => number,
): { reading: TarotSpread; card?: TarotCardDraw } {
  const positions = SPREAD_POSITIONS[fan.spread]
  if (!fan.hidden || fan.picks.length !== positions.length) throw new Error("A fan needs exactly one pick per position to be dealt")
  const reading: TarotSpread = {
    spread: fan.spread,
    cards: positions.map((position, index) => ({ position, ...fan.hidden![fan.picks[index]!]! })),
  }
  const card = signaturePosition ? drawSignatureCards(reading, [signaturePosition], random)[0] : undefined
  return { reading, ...(card ? { card } : {}) }
}
