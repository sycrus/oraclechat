import { z } from "zod"
import { runLocalAgent, type AgentRequest, type LocalModelConfig } from "../agent/runtime.js"
import type { TellerDefinition } from "../tellers/schema.js"
import type { TarotSpreadType } from "../tarot/draw.js"
import { withSpan } from "../observability/otel.js"
import { extractJsonArray } from "../agent/json.js"

const scoreListSchema = z.array(z.object({
  tellerId: z.string(),
  score: z.number().min(0).max(1),
  matchedCategories: z.array(z.enum(["topics", "emotionalTones", "situations"])),
}))

export type TellerScore = z.infer<typeof scoreListSchema>[number]

export type ReadingRequest = "named" | "unnamed" | "none"

export const WORKPLACE_TOOLS = [
  "three-lenses", "team-weather", "meeting-oracle", "culture-signals", "fork-in-the-road", "strength-in-disguise", "role-compass",
] as const
export type WorkplaceTool = (typeof WORKPLACE_TOOLS)[number]

/** One teller's routing for a turn: reply order, whether it was asked for a reading, and an optional search query. */
export interface TurnRoute extends TellerScore {
  reading: ReadingRequest
  spread?: TarotSpreadType
  query?: string
  workplaceTool?: WorkplaceTool
}

const READINGS: string[] = ["named", "unnamed", "none"]
const READING_DISCIPLINES = new Set(["tarot", "i-ching", "astrology"])
const SPREADS: string[] = ["one-card", "three-card", "celtic-cross"]
const MAX_QUERY_LENGTH = 200
const MAX_REPLY_LENGTH = 600

export function selectGroupResponders(
  scores: TellerScore[],
  lastSpokenAt: Record<string, number>,
): string[] {
  return [...scores].sort((left, right) => {
    const scoreOrder = right.score - left.score
    if (scoreOrder !== 0) return scoreOrder
    return (lastSpokenAt[left.tellerId] ?? Number.NEGATIVE_INFINITY)
      - (lastSpokenAt[right.tellerId] ?? Number.NEGATIVE_INFINITY)
  }).map((entry) => entry.tellerId)
}

export interface RouteTurnInput {
  message: string
  tellers: TellerDefinition[]
  /** The tellers' replies from the previous turn, so "yes, go ahead" can accept an offered reading. */
  previousReplies: Array<{ tellerName: string; content: string }>
}

// Evaluated against fixed reading, lookup and small-talk cases on the local model; change with care.
const INSTRUCTIONS = `You route one turn of a group chat between a user and some tellers (fortune tellers who are also friends). Return one route per supplied teller, in the same order. Do not write a reply.

For each teller:
- tellerId: the teller's id.
- score: 0 to 1, how relevant this teller is to the message, based on its activation profile.
- matchedCategories: which of topics, emotionalTones, situations matched; [] if none.
- reading: whether the user is ASKING FOR A DIVINATION READING (cards, a spread, a casting, "read for me", "pull a card", "cast for me", "do a reading", "look at my birth chart", "what are my transits doing?") in this message. This applies only to tarot, I Ching and astrology tellers. A workplace-reflection teller never gives a divination reading; use its workplaceTool field for a short work reflection instead. For reading disciplines:
  - "named": the user asks this teller by name, or asks everyone ("both", "you both", "you two", "all of you", "each of you"). When the user asks everyone, every teller is "named". Also "named" when the user accepts a reading this teller offered in previousReplies (for example "yes, go ahead" after "Want me to pull a few cards?").
  - "unnamed": the user asks for a reading without saying who ("could someone read for me?", "can I get a reading?").
  - "none": anything else. Sharing feelings, asking questions, thanking, sharing a link, mentioning cards or dreams, or asking about an earlier reading are NOT requests for a new reading. Only an explicit request counts.
- spread: for a tarot teller with a reading: the spread the user named (one-card, three-card, celtic-cross), otherwise the one that fits; otherwise "none".
- query: a short web search query only when current facts from the web (news, dates, events, public facts) would clearly help this teller answer; otherwise "". Never search for feelings, advice or readings.
- workplaceTool: for a workplace-reflection teller only, select at most one of three-lenses, team-weather, meeting-oracle, culture-signals, fork-in-the-road, strength-in-disguise or role-compass when one clearly fits this work context; otherwise "none". Other tellers always get "none". Select a tool to offer it briefly and optionally, not to launch a questionnaire. When the user accepts a tool Milo offered in previousReplies, return "none" so he continues from the conversation instead of repeating the offer. If the user declines the offer or changes the subject, return "none" and do not repeat it. Never select a tool for a greeting, an unrelated request, or just because the user mentions work.
  Tool cues: three-lenses for a vague problem that might be about people, process or purpose; team-weather for team climate; meeting-oracle for a specific upcoming meeting; culture-signals for stated work-style preferences; fork-in-the-road for a decision between options; strength-in-disguise for a frustration that may be a strength overused; role-compass for what the user wants more of in a role.`

/** JSON schema the local model must follow, so routing output always parses. */
function routeSchema(tellers: TellerDefinition[]): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      routes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tellerId: { type: "string", enum: tellers.map((teller) => teller.id) },
            score: { type: "number" },
            matchedCategories: { type: "array", items: { type: "string", enum: ["topics", "emotionalTones", "situations"] } },
            reading: { type: "string", enum: READINGS },
            spread: { type: "string", enum: [...SPREADS, "none"] },
            query: { type: "string" },
            workplaceTool: { type: "string", enum: [...WORKPLACE_TOOLS, "none"] },
          },
          required: ["tellerId", "score", "matchedCategories", "reading", "spread", "query", "workplaceTool"],
        },
      },
    },
    required: ["routes"],
  }
}

export async function routeTurn(
  input: RouteTurnInput,
  config?: LocalModelConfig,
  run: (request: AgentRequest, config?: LocalModelConfig) => Promise<string> = runLocalAgent,
): Promise<TurnRoute[]> {
  const tellers = input.tellers.map(({ id, displayName, discipline, activationProfile }) => ({ id, name: displayName, discipline, activationProfile }))
  const previousReplies = input.previousReplies.map((reply) => ({ tellerName: reply.tellerName, content: reply.content.slice(0, MAX_REPLY_LENGTH) }))
  return withSpan("oracle.orchestration.route", {}, async (span) => {
    const response = await run({
      name: "Oracle turn router",
      instructions: INSTRUCTIONS,
      input: JSON.stringify({ tellers, previousReplies, message: input.message }),
      thinking: false,
      temperature: 0,
      outputSchema: { name: "turn_routes", schema: routeSchema(input.tellers) },
    }, config)
    const routes = validateRouterResponse(response, input.tellers)
    for (const route of routes) {
      span.setAttribute(`teller.${route.tellerId}.score`, route.score)
      span.setAttribute(`teller.${route.tellerId}.matched_categories`, route.matchedCategories)
      span.setAttribute(`teller.${route.tellerId}.reading`, route.reading)
      if (route.spread) span.setAttribute(`teller.${route.tellerId}.spread`, route.spread)
      span.setAttribute(`teller.${route.tellerId}.lookup`, Boolean(route.query))
      if (route.workplaceTool) span.setAttribute(`teller.${route.tellerId}.workplace_tool`, route.workplaceTool)
    }
    return routes
  })
}

export function validateRouterResponse(response: string, tellers: TellerDefinition[]): TurnRoute[] {
  const entrySchema = z.object({
    tellerId: z.string().optional(),
    score: z.number().min(0).max(1),
    matchedCategories: z.array(z.string()).optional(),
    reading: z.unknown().optional(),
    spread: z.unknown().optional(),
    query: z.unknown().optional(),
    workplaceTool: z.unknown().optional(),
  })
  const categories = new Set<string>(["topics", "emotionalTones", "situations"])
  const entries = z.array(entrySchema).parse(JSON.parse(extractJsonArray(response, "Router response")))
  if (entries.length !== tellers.length) {
    throw new Error("Router must return exactly one score for each requested teller")
  }
  const parsed = entries.map((entry, index) => ({
    tellerId: entry.tellerId ?? tellers[index]!.id,
    score: entry.score,
    // Local models sometimes echo profile values (e.g. "emotions") instead of category names; drop those.
    matchedCategories: (entry.matchedCategories ?? []).filter((category) => categories.has(category)),
  }))
  const validated = scoreListSchema.parse(parsed)
  const expectedIds = new Set(tellers.map((teller) => teller.id))
  if (validated.some((entry) => !expectedIds.has(entry.tellerId))
      || new Set(validated.map((entry) => entry.tellerId)).size !== validated.length) {
    throw new Error("Router must return exactly one score for each requested teller")
  }
  return validated.map((score, index) => {
    const entry = entries[index]!
    const teller = tellers.find((candidate) => candidate.id === score.tellerId)!
    const reading = READING_DISCIPLINES.has(teller.discipline) && typeof entry.reading === "string" && READINGS.includes(entry.reading)
      ? entry.reading as ReadingRequest
      : "none"
    const query = typeof entry.query === "string" ? entry.query.trim().slice(0, MAX_QUERY_LENGTH) : ""
    const spread = reading !== "none" && teller.discipline === "tarot"
      ? (typeof entry.spread === "string" && SPREADS.includes(entry.spread) ? entry.spread as TarotSpreadType : "three-card")
      : undefined
    const workplaceTool = teller.discipline === "workplace-reflection" && typeof entry.workplaceTool === "string" && WORKPLACE_TOOLS.includes(entry.workplaceTool as WorkplaceTool)
      ? entry.workplaceTool as WorkplaceTool
      : undefined
    return { ...score, reading, ...(spread ? { spread } : {}), ...(query ? { query } : {}), ...(workplaceTool ? { workplaceTool } : {}) }
  })
}
