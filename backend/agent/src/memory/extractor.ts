import { z } from "zod"
import { runLocalAgent, type LocalModelConfig } from "../agent/runtime.js"
import type { MemoryOperation, UserMemory } from "./types.js"
import { extractJsonArray } from "../agent/json.js"

const operationSchema = z.object({
  op: z.enum(["add", "update"]),
  id: z.string().optional(),
  content: z.string().trim().min(3).max(300),
  kind: z.enum(["core", "detail"]).optional(),
  entities: z.array(z.string()).optional(),
})

export interface MemoryExtractionInput {
  userMessages: string[]
  /** Tellers in this conversation. */
  tellers: Array<{ id: string; name: string }>
  /** Every teller ID in the registry, so tags for absent tellers can be dropped. */
  knownTellerIds: string[]
  existing: UserMemory[]
}

/** Parse the distiller's operations; drop updates to unknown memories and tags for tellers not in the conversation. */
export function validateMemoryOperations(response: string, context: { existingIds: string[]; tellers: Array<{ id: string; name: string }>; knownTellerIds: string[] }): MemoryOperation[] {
  const entries = z.array(operationSchema).max(8).parse(JSON.parse(extractJsonArray(response, "Memory distiller response")))
  const known = new Set(context.existingIds)
  const conversationTellers = new Set(context.tellers.map((teller) => teller.id))
  const tellerByName = new Map(context.tellers.map((teller) => [teller.name.toLowerCase(), teller.id]))
  const knownTellers = new Set(context.knownTellerIds)
  const operations: MemoryOperation[] = []
  for (const entry of entries) {
    // A fact is a phrase; single tokens like "Idteller" are model noise.
    if (!/\s/.test(entry.content)) continue
    const entities = [...new Set((entry.entities ?? []).map((entity) => entity.trim().toLowerCase()).filter(Boolean)
      .map((entity) => tellerByName.get(entity) ?? entity))]
      .filter((entity) => !knownTellers.has(entity) || conversationTellers.has(entity))
      .slice(0, 6)
    const base = { content: entry.content, kind: entry.kind ?? "detail" as const, entities }
    if (entry.op === "update") {
      if (entry.id && known.has(entry.id)) operations.push({ op: "update", id: entry.id, ...base })
    } else {
      operations.push({ op: "add", ...base })
    }
  }
  return operations
}

export async function extractMemoryOperations(input: MemoryExtractionInput, config?: LocalModelConfig): Promise<MemoryOperation[]> {
  if (input.userMessages.length === 0) return []
  const output = await runLocalAgent({
    name: "Oracle memory distiller",
    instructions: [
      "Maintain a short list of durable, high-signal facts the user explicitly stated about themselves.",
      "Return only a JSON array of operations, or []. Each operation is {\"op\":\"add\",\"content\",\"kind\",\"entities\"} or {\"op\":\"update\",\"id\",\"content\",\"kind\",\"entities\"}.",
      "First compare every new fact with existingMemories. If it is about the same subject as an existing memory (where the user lives, their job, a relationship, a plan or habit), you must use update with that memory's id, even when the details changed. Example: existing {\"id\":\"m1\",\"content\":\"Lives in Tokyo\"} and the user says they moved to Osaka -> {\"op\":\"update\",\"id\":\"m1\",\"content\":\"Lives in Osaka\"}. Only use add for a subject no existing memory covers. Never add a duplicate. Never delete.",
      "kind is \"core\" only for identity-level facts (name, pronouns, closest relationships); otherwise \"detail\".",
      "entities: lower-case names of people, pets and places in the fact. If the fact is about the user's own interaction with a teller (for example a promise to Mira or advice the user took from Sage), include that teller's id. If only one teller is present, \"you\" in the user's messages means that teller.",
      "Do not infer, diagnose, or record questions, tarot interpretations, or anything a teller said.",
    ].join("\n"),
    input: JSON.stringify({
      userMessages: input.userMessages.slice(-3),
      tellers: input.tellers,
      existingMemories: input.existing.map(({ id, content, kind, entities }) => ({ id, content, kind, entities })),
    }),
    thinking: false,
  }, config)
  return validateMemoryOperations(output, { existingIds: input.existing.map((memory) => memory.id), tellers: input.tellers, knownTellerIds: input.knownTellerIds })
}
