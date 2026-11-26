/**
 * Deterministic checks for the teller model comparison eval (openspec add-teller-model-eval).
 * Each check is scoped to the replying teller's own discipline (ADR-0013): tarot names for tarot tellers, and so on.
 */
import { getTarotDeck } from "../tarot/catalog.js"
import type { TarotCardDraw, TarotSpread } from "../tarot/draw.js"
import type { IChingReading } from "../iching/cast.js"
import type { AstrologyReading } from "../astrology/chart.js"
import { hexagrams } from "../iching/hexagrams.js"

export type EvalReading = TarotSpread | IChingReading | AstrologyReading

export interface ReplyContext {
  teller: { id: string; displayName: string; discipline: string }
  otherTellerNames: string[]
  reply: string
  /** The reading this reply was given this turn, if any. */
  reading?: EvalReading
  signatureCard?: TarotCardDraw
  /** Readings shown earlier in the conversation, which the teller may refer back to. */
  earlierReadings: EvalReading[]
  userText: string
}

export interface ReplyCheck {
  /** Whether the reply names something from this turn's reading; null when there was no reading. */
  usedDraw: boolean | null
  /** Cards, hexagrams or placements named but not given by the app or the user. */
  invented: string[]
  /** Character problems: "ai-talk", "the-user", "speaks-as-other". */
  character: string[]
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Majors match case-sensitively ("The Tower" or "the Tower", "Strength"), so plain words don't count; minors ignore case. */
function cardPattern(name: string): RegExp {
  if (/ of (Wands|Cups|Swords|Pentacles)$/.test(name)) return new RegExp(`\\b${escape(name)}\\b`, "i")
  if (name.startsWith("The ")) return new RegExp(`\\b[Tt]he ${escape(name.slice(4))}\\b`)
  return new RegExp(`\\b${escape(name)}\\b`)
}
const DECK = getTarotDeck().map((name) => ({ name, pattern: cardPattern(name) }))

/** Names found in `text`, in order of first appearance. */
function found<T extends { name: string; pattern: RegExp }>(entries: T[], text: string): T[] {
  return entries.map((entry) => ({ entry, at: text.search(entry.pattern) })).filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at).map(({ entry }) => entry)
}

function tarotCards(reading: EvalReading | undefined): string[] {
  return reading && "cards" in reading ? reading.cards.map((card) => card.name) : []
}

function checkTarot(context: ReplyContext): Pick<ReplyCheck, "usedDraw" | "invented"> {
  const dealt = new Set([...tarotCards(context.reading), ...(context.signatureCard ? [context.signatureCard.name] : [])])
  const known = new Set([...dealt, ...context.earlierReadings.flatMap(tarotCards)])
  const named = found(DECK, context.reply)
  return {
    usedDraw: context.reading ? named.some((card) => dealt.has(card.name)) : null,
    invented: named.filter((card) => !known.has(card.name) && !card.pattern.test(context.userText)).map((card) => card.name),
  }
}

const hexagramsOf = (reading: EvalReading | undefined) =>
  reading && "primary" in reading ? [reading.primary, ...(reading.relating ? [reading.relating] : [])] : []
const HEXAGRAM_NUMBER = /\bhexagram\s*#?\s*(\d{1,2})\b/gi

function checkIChing(context: ReplyContext): Pick<ReplyCheck, "usedDraw" | "invented"> {
  const given = hexagramsOf(context.reading)
  const known = new Set([...given, ...context.earlierReadings.flatMap(hexagramsOf)].map((hexagram) => hexagram.number))
  const numbers = [...context.reply.matchAll(HEXAGRAM_NUMBER)].map((match) => Number(match[1]))
  const names = (number: number) => {
    const [pinyin, gloss] = hexagrams.find((hexagram) => hexagram.number === number)!.name.split(", ") as [string, string]
    return { pinyin: new RegExp(`\\b${escape(pinyin)}\\b`), gloss: new RegExp(`\\b${escape(gloss)}\\b`, "i") }
  }
  const usedDraw = context.reading
    ? given.some((hexagram) => numbers.includes(hexagram.number) || names(hexagram.number).pinyin.test(context.reply) || names(hexagram.number).gloss.test(context.reply))
    : null
  // Multi-word glosses of other hexagrams count as named; single words ("Peace", "Waiting") are too common to flag.
  const otherGlosses = hexagrams.filter((hexagram) => !known.has(hexagram.number))
    .map((hexagram) => ({ number: hexagram.number, gloss: hexagram.name.split(", ")[1]! }))
    .filter(({ gloss }) => gloss.includes(" ") && new RegExp(`\\b${escape(gloss)}\\b`).test(context.reply))
  const invented = [...new Set([...numbers.filter((number) => !known.has(number)), ...otherGlosses.map(({ number }) => number)])]
    .filter((number) => !new RegExp(`\\b${number}\\b`).test(context.userText))
    .map((number) => `Hexagram ${number}`)
  return { usedDraw, invented }
}

const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
const POINT_NAMES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Ascendant", "Rising", "Midheaven"]
const ASPECT_STEMS: Record<string, string> = { conjunction: "conjunct", sextile: "sextile", square: "squar", trine: "trin", opposition: "oppos" }
const SIGN = `(${SIGN_NAMES.join("|")})`, POINT = `(${POINT_NAMES.join("|")})`
const capitalized = (word: string) => word[0]!.toUpperCase() + word.slice(1)

function placementsOf(reading: EvalReading | undefined): Set<string> {
  if (!reading || !("natal" in reading)) return new Set()
  const { planets, ascendant, midheaven } = reading.natal
  return new Set([
    ...planets.map((planet) => `${capitalized(planet.point)} in ${capitalized(planet.sign)}`),
    `Ascendant in ${capitalized(ascendant.sign)}`,
    `Midheaven in ${capitalized(midheaven.sign)}`,
  ])
}

/** "Sun in Leo", "Moon is in Pisces", "Leo Sun", "Aries rising", normalized to "<Point> in <Sign>". */
function placementClaims(text: string): string[] {
  const normal = (point: string, sign: string) => `${point === "Rising" ? "Ascendant" : point} in ${sign}`
  return [
    ...[...text.matchAll(new RegExp(`\\b${POINT}\\s+(?:is\\s+|sits\\s+)?in\\s+${SIGN}\\b`, "g"))].map((match) => normal(match[1]!, match[2]!)),
    ...[...text.matchAll(new RegExp(`\\b${SIGN}\\s+${POINT}\\b`, "gi"))].map((match) => normal(capitalized(match[2]!.toLowerCase()), capitalized(match[1]!.toLowerCase()))),
  ]
}

function checkAstrology(context: ReplyContext): Pick<ReplyCheck, "usedDraw" | "invented"> {
  const given = placementsOf(context.reading)
  const known = new Set([...given, ...context.earlierReadings.flatMap((reading) => [...placementsOf(reading)])])
  const claims = [...new Set(placementClaims(context.reply))]
  const transitUsed = context.reading && "transits" in context.reading && context.reading.transits.some((transit) =>
    new RegExp(`\\b${capitalized(transit.planet)}\\b`).test(context.reply) && new RegExp(ASPECT_STEMS[transit.aspect]!, "i").test(context.reply))
  return {
    usedDraw: context.reading ? claims.some((claim) => given.has(claim)) || Boolean(transitUsed) : null,
    invented: claims.filter((claim) => !known.has(claim) && !placementClaims(context.userText).includes(claim)),
  }
}

const AI_TALK = /\b(as an ai|an ai (?:model|assistant)|language model|i'?m (?:an? )?(?:ai|assistant|chatbot)|chatgpt|openai)\b/i

function checkCharacter(context: ReplyContext): string[] {
  const problems: string[] = []
  if (AI_TALK.test(context.reply)) problems.push("ai-talk")
  if (/\bthe user\b/i.test(context.reply)) problems.push("the-user")
  const others = context.otherTellerNames.map(escape).join("|")
  if (others && new RegExp(`^\\s*(?:\\*\\*)?(?:${others})(?:\\*\\*)?\\s*:`, "m").test(context.reply)) problems.push("speaks-as-other")
  return problems
}

export function checkReply(context: ReplyContext): ReplyCheck {
  const draws = context.teller.discipline === "tarot" ? checkTarot(context)
    : context.teller.discipline === "i-ching" ? checkIChing(context)
      : context.teller.discipline === "astrology" ? checkAstrology(context)
        : { usedDraw: null, invented: [] }
  return { ...draws, character: checkCharacter(context) }
}

/** Pair chats: exactly the expected tellers gave a reading this turn. */
export function checkRightTeller(expectedReaders: string[], readByTeller: Record<string, boolean>): boolean {
  return Object.entries(readByTeller).every(([tellerId, read]) => read === expectedReaders.includes(tellerId))
}
