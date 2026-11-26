import { createApp } from "./server/app.js"
import { initTelemetry, shutdownTelemetry } from "./observability/otel.js"
import { Pool } from "pg"
import { PostgresChatStore } from "./chat/store.js"
import { ChatService } from "./chat/service.js"
import { TellerRegistry } from "./tellers/registry.js"
import { routeTurn } from "./orchestration/router.js"
import { streamLocalAgent } from "./agent/runtime.js"
import { fileURLToPath } from "node:url"
import { PostgresMemoryStore } from "./memory/store.js"
import { MemoryService } from "./memory/service.js"
import { extractMemoryOperations } from "./memory/extractor.js"
import { createOllamaEmbedder } from "./memory/embedder.js"
import { createBraveSearch } from "./search/brave.js"
import { createLinkReader } from "./search/links.js"
import { createHostedStream, loadHostedModelConfig } from "./agent/hosted.js"
import { loadGuardrailsConfig } from "./guardrails/config.js"
import { createOpenAIGuardrails } from "./guardrails/openai.js"
import { createSpeechClient } from "./speech/client.js"
import { PostgresBirthProfileStore } from "./astrology/profile-store.js"

const port = Number(process.env["PORT"] ?? "4000")
const host = process.env["HOST"] ?? "127.0.0.1"

async function start(): Promise<void> {
  // Hosted teller replies are opt-in (ADR-0014); a partial configuration stops startup here.
  const hosted = loadHostedModelConfig()
  // Guardrails only under `start:guarded` (ADR-0021); the flag without its variables stops startup here.
  const guardrails = loadGuardrailsConfig()
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] ?? "postgres://agent:localdev@127.0.0.1:5432/agent_memory" })
  const store = new PostgresChatStore(pool)
  await store.initialize()
  const memoryStore = new PostgresMemoryStore(pool)
  await memoryStore.initialize()
  const memoryService = new MemoryService(memoryStore, { embed: createOllamaEmbedder() })
  // The owner's consented birth details for astrology readings (ADR-0018).
  const birthProfiles = new PostgresBirthProfileStore(pool)
  await birthProfiles.initialize()
  const registry = new TellerRegistry()
  await registry.loadFromDirectory(fileURLToPath(new URL("./tellers/definitions", import.meta.url)))
  const chatService = new ChatService({
    store,
    registry,
    route: (input) => routeTurn(input),
    stream: hosted ? createHostedStream(hosted) : (request, onChunk) => streamLocalAgent(request, onChunk),
    hostedReplies: Boolean(hosted),
    ...(guardrails ? { guardrails: createOpenAIGuardrails(guardrails) } : {}),
    memory: memoryService,
    birthProfiles,
    ...(process.env["BRAVE_SEARCH_API_KEY"]?.trim() ? { search: createBraveSearch({ apiKey: process.env["BRAVE_SEARCH_API_KEY"].trim() }) } : {}),
    readLink: createLinkReader(),
    extractMemory: (input) => extractMemoryOperations(input),
    tellerThinking: process.env["TELLER_THINKING"] === "true",
    ...(Number(process.env["HISTORY_TOKEN_BUDGET"]) > 0 ? { historyTokenBudget: Number(process.env["HISTORY_TOKEN_BUDGET"]) } : {}),
  })
  initTelemetry()
  // Speech for video calls is always local (ADR-0015); unset means "voice offline".
  const ttsBaseUrl = process.env["TTS_BASE_URL"]?.trim()
  const speech = { tellers: registry, ...(ttsBaseUrl ? { client: createSpeechClient({ baseUrl: ttsBaseUrl }) } : {}) }
  const server = createApp(chatService, { speech, birthProfiles }).listen(port, host, () => {
    console.log(`[oracle-agent] listening on http://${host}:${port}`)
  })

  const stop = () => server.close(async (error) => {
    if (error) console.error("[oracle-agent] shutdown error", error)
    await store.close()
    await shutdownTelemetry()
    process.exitCode = error ? 1 : 0
  })
  process.once("SIGINT", stop)
  process.once("SIGTERM", stop)
}

void start().catch((error: unknown) => {
  console.error("[oracle-agent] startup failed", error)
  process.exitCode = 1
})
