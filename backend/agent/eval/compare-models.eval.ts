/**
 * Teller model comparison: every case runs through the real ChatService with local and hosted teller replies.
 * Routing is local, computed once per turn and reused by both arms. Run with `pnpm --filter @oracle/agent eval:models`.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { getGlobalTraceProvider } from "@openai/agents"
import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { expect, it } from "vitest"
import { ChatService, type ChatEvent } from "../src/chat/service.js"
import { PostgresChatStore } from "../src/chat/store.js"
import type { ChatMessage, ChatStore } from "../src/chat/types.js"
import { TellerRegistry } from "../src/tellers/registry.js"
import { routeTurn, type TurnRoute } from "../src/orchestration/router.js"
import { loadLocalModelConfig, streamLocalAgent, type AgentRequest, type AgentTextChunkHandler } from "../src/agent/runtime.js"
import { createHostedStream, loadHostedModelConfig } from "../src/agent/hosted.js"
import { SPREAD_POSITIONS } from "../src/tarot/draw.js"
import type { BirthProfile } from "../src/astrology/details.js"
import { checkReply, checkRightTeller, type EvalReading, type ReplyCheck } from "../src/eval/checks.js"
import type { TarotCardDraw } from "../src/tarot/draw.js"
import { CASES, type EvalCase } from "./cases.js"

type Arm = "local" | "hosted"
type Stream = (request: AgentRequest, onChunk: AgentTextChunkHandler) => Promise<string>

interface ReplyResult { turn: number; tellerId: string; text: string; ms: number; reading?: EvalReading; check: ReplyCheck }
interface CaseResult { id: string; arm: Arm; replies: ReplyResult[]; rightTeller?: boolean; readers: string[]; error?: string }

// A fixed, made-up birth profile (London), so Astra reads without the form.
const BIRTH: BirthProfile = { date: "1994-08-02", time: "14:30", placeId: 2643743 }
const routes = new Map<string, TurnRoute[]>()

async function runCase(evalCase: EvalCase, arm: Arm, stream: Stream, registry: TellerRegistry): Promise<CaseResult> {
  const { Pool: MemoryPool } = newDb().adapters.createPg()
  const store: ChatStore = new PostgresChatStore(new MemoryPool() as unknown as Pool)
  await (store as PostgresChatStore).initialize()
  let profile: BirthProfile | undefined = BIRTH
  const birthProfiles = { get: async () => profile, save: async (next: BirthProfile) => { profile = next }, delete: async () => { profile = undefined } }

  let turn = 0
  const timings: number[] = []
  const service = new ChatService({
    store, registry, birthProfiles, hostedReplies: arm === "hosted",
    // Routing is computed once per turn, on whichever arm runs first, then reused.
    route: async (input) => {
      const key = `${evalCase.id}#${turn}`
      if (!routes.has(key)) routes.set(key, await routeTurn(input))
      return routes.get(key)!
    },
    stream: async (request, onChunk) => { const start = Date.now(); const text = await stream(request, onChunk); timings.push(Date.now() - start); return text },
  })

  const conversation = await service.createConversation(evalCase.tellers)
  const result: CaseResult = { id: evalCase.id, arm, replies: [], readers: [] }
  const tellerName = (id: string) => registry.get(id)!.displayName
  try {
    for (const [index, text] of evalCase.turns.entries()) {
      turn = index
      const before = (await store.getConversation(conversation.id))!.messages
      const earlierReadings = before.flatMap((message) => message.reading ? [message.reading as EvalReading] : [])
      const dealt = new Map<string, { reading: EvalReading; card?: TarotCardDraw }>()
      const emit = (event: ChatEvent) => {
        if (event.type === "message_update" && event.message?.reading && event.tellerId) {
          dealt.set(event.tellerId, { reading: event.message.reading as EvalReading, ...(event.message.signatureCard ? { card: event.message.signatureCard } : {}) })
        }
      }
      const startTimings = timings.length
      await service.sendMessage(conversation.id, text, emit)
      await playInteractions(service, store, conversation.id, before.length, emit)

      const after = (await store.getConversation(conversation.id))!.messages.slice(before.length)
      const replies = after.filter((message): message is ChatMessage => message.senderType === "teller" && !message.interaction)
      const readers = new Set<string>()
      replies.forEach((message, replyIndex) => {
        const own = message.reading ? { reading: message.reading as EvalReading, card: message.signatureCard } : dealt.get(message.senderId)
        if (own) readers.add(message.senderId)
        const teller = registry.get(message.senderId)!
        result.replies.push({
          turn: index, tellerId: message.senderId, text: message.content, ms: timings[startTimings + replyIndex] ?? 0,
          ...(own ? { reading: own.reading } : {}),
          check: checkReply({
            teller, otherTellerNames: evalCase.tellers.filter((id) => id !== teller.id).map(tellerName), reply: message.content,
            ...(own ? { reading: own.reading } : {}), ...(own?.card ? { signatureCard: own.card } : {}), earlierReadings, userText: text,
          }),
        })
      })
      if (index === evalCase.turns.length - 1) {
        result.readers = [...readers]
        if (evalCase.expectReaders === "one") result.rightTeller = readers.size === 1
        else if (evalCase.expectReaders) {
          result.rightTeller = checkRightTeller(evalCase.expectReaders, Object.fromEntries(evalCase.tellers.map((id) => [id, readers.has(id)])))
        }
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
  }
  return result
}

/** Plays every fan and coin toss laid out this turn the way a user would: first cards picked, then revealed; six tosses. */
async function playInteractions(service: ChatService, store: ChatStore, conversationId: string, from: number, emit: (event: ChatEvent) => void) {
  const laidOut = (await store.getConversation(conversationId))!.messages.slice(from).filter((message) => message.interaction)
  for (const message of laidOut) {
    const interaction = message.interaction!
    if (interaction.kind === "card-fan" && interaction.state === "open") {
      for (let index = 0; index < SPREAD_POSITIONS[interaction.spread].length; index += 1) await service.interact(conversationId, message.id, { action: "pick", index }, emit)
      await service.interact(conversationId, message.id, { action: "reveal" }, emit)
    } else if (interaction.kind === "coin-toss" && interaction.state === "casting") {
      for (let after = 0; after < 6; after += 1) await service.interact(conversationId, message.id, { action: "toss", after }, emit)
    }
  }
}

const rate = (passed: number, total: number) => total ? `${passed}/${total} (${Math.round((passed / total) * 100)}%)` : "n/a"

function summarize(results: CaseResult[], arms: Record<Arm, string>): string {
  const lines = [`# Teller model comparison`, "", `Run ${new Date().toISOString()}. Local: \`${arms.local}\`. Hosted: \`${arms.hosted}\`. Routing: local, shared by both arms.`, ""]
  lines.push("| Check | Local | Hosted |", "|---|---|---|")
  const of = (arm: Arm) => results.filter((result) => result.arm === arm)
  const replies = (arm: Arm) => of(arm).flatMap((result) => result.replies)
  const row = (label: string, value: (arm: Arm) => string) => lines.push(`| ${label} | ${value("local")} | ${value("hosted")} |`)
  row("Used the app-owned draw (replies with a reading)", (arm) => { const r = replies(arm).filter((reply) => reply.check.usedDraw !== null); return rate(r.filter((reply) => reply.check.usedDraw).length, r.length) })
  row("Invented nothing", (arm) => rate(replies(arm).filter((reply) => reply.check.invented.length === 0).length, replies(arm).length))
  row("Stayed in character", (arm) => rate(replies(arm).filter((reply) => reply.check.character.length === 0).length, replies(arm).length))
  row("Right teller read (pair cases)", (arm) => { const r = of(arm).filter((result) => result.rightTeller !== undefined); return rate(r.filter((result) => result.rightTeller).length, r.length) })
  row("Errors", (arm) => String(of(arm).filter((result) => result.error).length))
  row("Median reply time", (arm) => { const ms = replies(arm).map((reply) => reply.ms).sort((a, b) => a - b); return ms.length ? `${(ms[Math.floor(ms.length / 2)]! / 1000).toFixed(1)} s` : "n/a" })
  lines.push("", "## Per case", "", "| Case | Readers (local / hosted) | Local | Hosted |", "|---|---|---|---|")
  const verdict = (result: CaseResult | undefined) => {
    if (!result) return "-"
    if (result.error) return `error: ${result.error.slice(0, 60)}`
    const problems = result.replies.flatMap((reply) => [
      ...(reply.check.usedDraw === false ? ["no draw"] : []), ...reply.check.invented.map((item) => `invented ${item}`), ...reply.check.character,
    ])
    if (result.rightTeller === false) problems.push("wrong teller")
    return problems.length ? problems.join(", ") : "ok"
  }
  const ran = CASES.filter((evalCase) => results.some((result) => result.id === evalCase.id))
  for (const evalCase of ran) {
    const local = results.find((result) => result.id === evalCase.id && result.arm === "local")
    const hosted = results.find((result) => result.id === evalCase.id && result.arm === "hosted")
    lines.push(`| ${evalCase.id} | ${local?.readers.join("+") || "none"} / ${hosted?.readers.join("+") || "none"} | ${verdict(local)} | ${verdict(hosted)} |`)
  }
  lines.push("", "## Transcripts", "")
  for (const evalCase of ran) {
    lines.push(`### ${evalCase.id}`, "")
    evalCase.turns.forEach((text, turn) => {
      lines.push(`**User:** ${text}`, "")
      for (const arm of ["local", "hosted"] as const) {
        const result = results.find((candidate) => candidate.id === evalCase.id && candidate.arm === arm)
        for (const reply of result?.replies.filter((candidate) => candidate.turn === turn) ?? []) {
          lines.push(`- *${arm}* **${reply.tellerId.split("-")[0]}**${reply.reading ? " (with reading)" : ""}: ${reply.text.replace(/\s*\n+\s*/g, " ")}`)
        }
      }
      lines.push("")
    })
  }
  return lines.join("\n")
}

it("compares local and hosted teller replies", async () => {
  const hosted = loadHostedModelConfig()
  if (!hosted) throw new Error("Set HOSTED_BASE_URL, HOSTED_API_KEY and HOSTED_MODEL in .env to run the comparison")
  const local = loadLocalModelConfig()
  const registry = new TellerRegistry()
  await registry.loadFromDirectory("src/tellers/definitions")
  const arms: Record<Arm, Stream> = { local: (request, onChunk) => streamLocalAgent(request, onChunk, local), hosted: createHostedStream(hosted) }
  const only = process.env["EVAL_CASES"]?.split(",").map((id) => id.trim())
  const cases = CASES.filter((evalCase) => !only || only.includes(evalCase.id))

  const results: CaseResult[] = []
  for (const arm of ["local", "hosted"] as const) {
    for (const evalCase of cases) {
      const result = await runCase(evalCase, arm, arms[arm], registry)
      console.log(`[eval] ${arm} ${evalCase.id}: ${result.error ? `error ${result.error}` : `${result.replies.length} replies`}`)
      results.push(result)
    }
  }
  await getGlobalTraceProvider().forceFlush()

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  mkdirSync("eval/results", { recursive: true })
  writeFileSync(`eval/results/${stamp}.json`, JSON.stringify({ arms: { local: local.model, hosted: hosted.model }, routes: Object.fromEntries(routes), results }, null, 2))
  writeFileSync(`eval/results/${stamp}.md`, summarize(results, { local: local.model, hosted: hosted.model }))
  console.log(`[eval] wrote eval/results/${stamp}.md`)
  expect(results).toHaveLength(cases.length * 2)
})
