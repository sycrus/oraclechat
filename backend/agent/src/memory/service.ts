import { withSpan } from "../observability/otel.js"
import { cosineSimilarity, type Embed } from "./embedder.js"
import type { MemoryKind, MemoryOperation, MemoryStore, StoredMemory, UserMemory } from "./types.js"

export const RECALL_LIMIT = 8
export const CORE_LIMIT = 3
/**
 * Tuned on nomic-embed-text (2026-11-18): real matches scored 0.47–0.59 and noise up to 0.48, so an absolute floor
 * alone is not enough. A match must also stand clearly above the query's average similarity across all memories.
 */
export const SIMILARITY_FLOOR = 0.45
export const SIMILARITY_MARGIN = 0.09
export const SEMANTIC_LIMIT = 3

export interface MemoryServiceOptions {
  /** Local embedder; without one, recall uses core and entity matches only. */
  embed?: Embed
}

function visible({ embedding: _embedding, ...memory }: StoredMemory): UserMemory {
  return memory
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export class MemoryService {
  constructor(private readonly store: MemoryStore, private readonly options: MemoryServiceOptions = {}) {}

  hasConsent() { return this.store.hasConsent() }

  async list(): Promise<UserMemory[]> {
    return await this.store.hasConsent() ? (await this.store.list()).map(visible) : []
  }

  async setConsent(consented: boolean): Promise<void> {
    if (!consented) {
      await this.store.clear()
      await this.store.setHostedConsent(false)
    }
    await this.store.setConsent(consented)
  }

  /** True only when memory consent and hosted sharing are both on. */
  hasHostedConsent() { return this.store.hasHostedConsent() }

  async setHostedConsent(consented: boolean): Promise<void> {
    if (consented && !await this.store.hasConsent()) throw new Error("Memory consent is required before sharing memories with a hosted model")
    await this.store.setHostedConsent(consented)
  }

  async remember(content: string, sourceConversationId: string): Promise<UserMemory> {
    await this.apply([{ op: "add", content, kind: "detail", entities: [] }], sourceConversationId)
    const text = content.trim().toLocaleLowerCase()
    const saved = (await this.list()).find((memory) => memory.content.toLocaleLowerCase() === text)
    if (!saved) throw new Error("Memory content cannot be empty")
    return saved
  }

  /** Apply distiller operations: adds skip exact duplicates, updates replace in place; changed contents are re-embedded. */
  async apply(operations: MemoryOperation[], sourceConversationId: string): Promise<void> {
    if (!await this.store.hasConsent()) throw new Error("Memory consent is required before saving personal context")
    const existing = await this.store.list()
    const changed: Array<{ id?: string; op: MemoryOperation; content: string }> = []
    for (const op of operations) {
      const content = op.content.trim()
      if (!content) continue
      if (op.op === "add") {
        const lower = content.toLocaleLowerCase()
        if (existing.some((memory) => memory.content.toLocaleLowerCase() === lower)
          || changed.some((entry) => entry.content.toLocaleLowerCase() === lower)) continue
      }
      changed.push({ op, content })
    }
    const embeddings = await this.embedAll(changed.map((entry) => entry.content))
    for (const [index, { op, content }] of changed.entries()) {
      const embedding = embeddings?.[index] ?? null
      if (op.op === "add") {
        const saved = await this.store.add({ content, sourceConversationId, kind: op.kind, entities: op.entities, embedding })
        existing.push(saved)
      } else {
        await this.store.update(op.id, { content, kind: op.kind, entities: op.entities, embedding })
      }
    }
  }

  async edit(id: string, patch: { content?: string; kind?: MemoryKind }): Promise<UserMemory> {
    if (!await this.store.hasConsent()) throw new Error("Memory consent is required")
    const content = patch.content?.trim()
    if (patch.content !== undefined && !content) throw new Error("Memory content cannot be empty")
    const update: Parameters<MemoryStore["update"]>[1] = {}
    if (patch.kind) update.kind = patch.kind
    if (content) {
      update.content = content
      update.embedding = (await this.embedAll([content]))?.[0] ?? null
    }
    const memory = await this.store.update(id, update)
    if (!memory) throw new Error("Memory not found")
    return visible(memory)
  }

  /** Called before clearing all chat history: memories are kept, without a source conversation. */
  async keepAfterChatClear(): Promise<void> {
    await this.store.detachAllSources()
  }

  async delete(id: string): Promise<void> {
    if (!await this.store.hasConsent()) throw new Error("Memory consent is required")
    await this.store.delete(id)
  }

  /** Select the memories relevant to this message (and responding teller): core, then entity matches, then semantic matches. */
  async recall(input: { message: string; tellerId?: string }): Promise<UserMemory[]> {
    if (!await this.store.hasConsent()) return []
    return withSpan("oracle.memory.recall", {}, async (span) => {
      const memories = await this.store.list()
      const message = input.message.toLowerCase()
      const selected = new Map<string, StoredMemory>()
      const add = (memory: StoredMemory) => { if (selected.size < RECALL_LIMIT && !selected.has(memory.id)) selected.set(memory.id, memory) }

      const core = memories.filter((memory) => memory.kind === "core").slice(0, CORE_LIMIT)
      core.forEach(add)
      const entity = memories.filter((memory) => memory.entities.some((name) =>
        name === input.tellerId || new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}($|[^\\p{L}\\p{N}])`, "u").test(message)))
      entity.forEach(add)

      let semantic: StoredMemory[] = []
      const [query] = (await this.embedAll([input.message])) ?? []
      if (query) {
        const scored = memories
          .filter((memory) => memory.embedding)
          .map((memory) => ({ memory, score: cosineSimilarity(query, memory.embedding!) }))
        const average = scored.reduce((sum, entry) => sum + entry.score, 0) / Math.max(scored.length, 1)
        semantic = scored
          .filter((entry) => entry.score >= SIMILARITY_FLOOR && (scored.length <= SEMANTIC_LIMIT || entry.score - average >= SIMILARITY_MARGIN))
          .sort((left, right) => right.score - left.score)
          .slice(0, SEMANTIC_LIMIT)
          .map((entry) => entry.memory)
        semantic.forEach(add)
      }

      span.setAttribute("oracle.memory.total", memories.length)
      span.setAttribute("oracle.memory.core", core.length)
      span.setAttribute("oracle.memory.entity", entity.length)
      span.setAttribute("oracle.memory.semantic", semantic.length)
      span.setAttribute("oracle.memory.selected", selected.size)
      return [...selected.values()].map(visible)
    })
  }

  private async embedAll(texts: string[]): Promise<number[][] | null> {
    if (!this.options.embed || texts.length === 0) return null
    try {
      return await this.options.embed(texts)
    } catch {
      return null
    }
  }
}
