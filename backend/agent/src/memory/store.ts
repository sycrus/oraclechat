import { randomUUID } from "node:crypto"
import type { Pool } from "pg"
import type { MemoryKind, MemoryPatch, MemoryStore, NewMemory, StoredMemory } from "./types.js"

interface MemoryRow {
  id: string
  content: string
  source_conversation_id: string | null
  kind: string | null
  entities: unknown
  embedding: unknown
  created_at: Date | string
  updated_at: Date | string
}

const COLUMNS = "id, content, source_conversation_id, kind, entities, embedding, created_at, updated_at"

function json<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  return (typeof value === "string" ? JSON.parse(value) : value) as T
}

function toMemory(row: MemoryRow): StoredMemory {
  return {
    id: row.id,
    content: row.content,
    sourceConversationId: row.source_conversation_id,
    kind: row.kind === "core" ? "core" : "detail",
    entities: json<string[]>(row.entities, []),
    embedding: json<number[] | null>(row.embedding, null),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export class PostgresMemoryStore implements MemoryStore {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS memory_consent (
      user_id TEXT PRIMARY KEY,
      consented BOOLEAN NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await this.pool.query(`CREATE TABLE IF NOT EXISTS user_memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      source_conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'detail',
      entities JSONB,
      embedding JSONB,
      sequence BIGSERIAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await this.pool.query("ALTER TABLE user_memories ALTER COLUMN source_conversation_id DROP NOT NULL")
    await this.pool.query("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'detail'")
    await this.pool.query("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS entities JSONB")
    await this.pool.query("ALTER TABLE memory_consent ADD COLUMN IF NOT EXISTS hosted_consented BOOLEAN NOT NULL DEFAULT false")
    await this.pool.query("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS embedding JSONB")
    await this.pool.query("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS sequence BIGSERIAL")
    await this.pool.query("CREATE INDEX IF NOT EXISTS user_memories_user_idx ON user_memories (user_id, created_at)")
  }

  async hasConsent(): Promise<boolean> {
    const result = await this.pool.query<{ consented: boolean }>("SELECT consented FROM memory_consent WHERE user_id = $1", ["local-user"])
    return result.rows[0]?.consented === true
  }

  async setConsent(consented: boolean): Promise<void> {
    await this.pool.query("INSERT INTO memory_consent (user_id, consented, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET consented = EXCLUDED.consented, updated_at = NOW()", ["local-user", consented])
  }

  async hasHostedConsent(): Promise<boolean> {
    const result = await this.pool.query<{ consented: boolean; hosted_consented: boolean }>("SELECT consented, hosted_consented FROM memory_consent WHERE user_id = $1", ["local-user"])
    return result.rows[0]?.consented === true && result.rows[0]?.hosted_consented === true
  }

  async setHostedConsent(consented: boolean): Promise<void> {
    await this.pool.query("UPDATE memory_consent SET hosted_consented = $2, updated_at = NOW() WHERE user_id = $1", ["local-user", consented])
  }

  async list(): Promise<StoredMemory[]> {
    const result = await this.pool.query<MemoryRow>(`SELECT ${COLUMNS} FROM user_memories WHERE user_id = $1 ORDER BY sequence`, ["local-user"])
    return result.rows.map(toMemory)
  }

  async add(memory: NewMemory): Promise<StoredMemory> {
    const result = await this.pool.query<MemoryRow>(
      `INSERT INTO user_memories (id, user_id, content, source_conversation_id, kind, entities, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
      [randomUUID(), "local-user", memory.content, memory.sourceConversationId, memory.kind, JSON.stringify(memory.entities), memory.embedding ? JSON.stringify(memory.embedding) : null],
    )
    return toMemory(result.rows[0]!)
  }

  async update(id: string, patch: MemoryPatch): Promise<StoredMemory | null> {
    const current = (await this.pool.query<MemoryRow>(`SELECT ${COLUMNS} FROM user_memories WHERE id = $1 AND user_id = $2`, [id, "local-user"])).rows[0]
    if (!current) return null
    const merged = { ...toMemory(current), ...patch }
    const result = await this.pool.query<MemoryRow>(
      `UPDATE user_memories SET content = $1, kind = $2, entities = $3, embedding = $4, updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING ${COLUMNS}`,
      [merged.content, merged.kind satisfies MemoryKind, JSON.stringify(merged.entities), merged.embedding ? JSON.stringify(merged.embedding) : null, id, "local-user"],
    )
    return result.rows[0] ? toMemory(result.rows[0]) : null
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM user_memories WHERE id = $1 AND user_id = $2", [id, "local-user"])
  }

  async detachAllSources(): Promise<void> {
    await this.pool.query("UPDATE user_memories SET source_conversation_id = NULL WHERE user_id = $1", ["local-user"])
  }

  async clear(): Promise<void> {
    await this.pool.query("DELETE FROM user_memories WHERE user_id = $1", ["local-user"])
  }
}
