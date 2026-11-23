export interface TarotCard {
  position: "guidance" | "past" | "present" | "future"
    | "heart" | "challenge" | "foundation" | "recent-past" | "conscious"
    | "near-future" | "self" | "environment" | "hopes-fears" | "outcome"
  name: string
  orientation: "upright" | "reversed"
  artKey: string
  meaning: string
}

export interface TarotSpread {
  spread: "one-card" | "three-card" | "celtic-cross"
  cards: TarotCard[]
}

export interface SignatureCard extends Omit<TarotCard, "position"> {
  position: "action" | "shadow"
}

const SPREAD_POSITIONS: Record<TarotSpread["spread"], string[]> = {
  "one-card": ["guidance"],
  "three-card": ["past", "present", "future"],
  "celtic-cross": ["heart", "challenge", "foundation", "recent-past", "conscious", "near-future", "self", "environment", "hopes-fears", "outcome"],
}

const validArtKey = (value: string) => /^major-(?:[0-9]|1[0-9]|2[01])$/.test(value)
  || /^(?:wands|cups|swords|pentacles)-(?:ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)$/.test(value)

export function parseSignatureCard(value: unknown): SignatureCard | null {
  if (!value || typeof value !== "object") return null
  const card = value as Record<string, unknown>
  if ((card.position !== "action" && card.position !== "shadow")
      || typeof card.name !== "string" || !card.name.trim()
      || (card.orientation !== "upright" && card.orientation !== "reversed")
      || typeof card.artKey !== "string" || !validArtKey(card.artKey)
      || typeof card.meaning !== "string" || !card.meaning.trim()) return null
  return { position: card.position, name: card.name, orientation: card.orientation, artKey: card.artKey, meaning: card.meaning }
}

export function parseTarotSpread(value: unknown): TarotSpread | null {
  if (!value || typeof value !== "object") return null
  const spread = value as { spread?: unknown; cards?: unknown }
  if (typeof spread.spread !== "string" || !Object.hasOwn(SPREAD_POSITIONS, spread.spread)) return null
  if (!Array.isArray(spread.cards)) return null
  const expectedPositions = SPREAD_POSITIONS[spread.spread as TarotSpread["spread"]]
  if (spread.cards.length !== expectedPositions.length) return null

  const cards: TarotCard[] = []
  for (const [index, item] of spread.cards.entries()) {
    if (!item || typeof item !== "object") return null
    const card = item as Record<string, unknown>
    if (card.position !== expectedPositions[index]
        || typeof card.name !== "string" || !card.name.trim()
        || (card.orientation !== "upright" && card.orientation !== "reversed")
        || typeof card.artKey !== "string" || !validArtKey(card.artKey)
        || typeof card.meaning !== "string" || !card.meaning.trim()) return null
    cards.push({
      position: card.position as TarotCard["position"],
      name: card.name,
      orientation: card.orientation,
      artKey: card.artKey,
      meaning: card.meaning,
    })
  }
  if (new Set(cards.map((card) => card.name)).size !== cards.length
      || new Set(cards.map((card) => card.artKey)).size !== cards.length) return null
  return { spread: spread.spread as TarotSpread["spread"], cards }
}
