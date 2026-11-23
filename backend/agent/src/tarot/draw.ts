import { randomInt } from "node:crypto"
import { getTarotCardContent, getTarotDeck } from "./catalog.js"

export type TarotSpreadType = "one-card" | "three-card" | "celtic-cross"
export type TarotOrientation = "upright" | "reversed"

export interface TarotCardDraw {
  position: "guidance" | "past" | "present" | "future" | "action" | "shadow"
    | "heart" | "challenge" | "foundation" | "recent-past" | "conscious"
    | "near-future" | "self" | "environment" | "hopes-fears" | "outcome"
  name: string
  orientation: TarotOrientation
  artKey: string
  meaning: string
}

export interface TarotSpread {
  spread: TarotSpreadType
  cards: TarotCardDraw[]
}

export const SPREAD_POSITIONS: Record<TarotSpreadType, TarotCardDraw["position"][]> = {
  "one-card": ["guidance"],
  "three-card": ["past", "present", "future"],
  "celtic-cross": ["heart", "challenge", "foundation", "recent-past", "conscious", "near-future", "self", "environment", "hopes-fears", "outcome"],
}

export function drawSpread(spread: TarotSpreadType | undefined = "three-card", random: () => number = defaultRandom): TarotSpread {
  const type = spread ?? "three-card"
  const positions = SPREAD_POSITIONS[type]
  const cards = shuffle(getTarotDeck(), random)
  return { spread: type, cards: positions.map((position, index) => drawCard(position, cards[index]!, random)) }
}

export function drawSignatureCards<P extends "action" | "shadow">(spread: TarotSpread, positions: P[], random: () => number = defaultRandom): Array<TarotCardDraw & { position: P }> {
  const used = new Set(spread.cards.map((card) => card.name))
  const cards = shuffle(getTarotDeck().filter((name) => !used.has(name)), random)
  return positions.map((position, index) => drawCard(position, cards[index]!, random))
}

function defaultRandom(): number { return randomInt(0, 0x100000000) / 0x100000000 }

function shuffle(cards: string[], random: () => number): string[] {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[cards[index], cards[target]] = [cards[target]!, cards[index]!]
  }
  return cards
}

function drawCard<P extends TarotCardDraw["position"]>(position: P, name: string, random: () => number): TarotCardDraw & { position: P } {
  const content = getTarotCardContent(name)
  const orientation = random() < 0.5 ? "upright" : "reversed"
  return { position, name, orientation, artKey: content.artKey, meaning: content[orientation] }
}

