import type { Pool } from "pg"
import type {
  AppendMessageInput,
  ChatConversation,
  ChatMessage,
  ChatStore,
  ConversationSummary,
  CreateConversationInput,
  LastMessage,
} from "./types.js"
import { previewText } from "./preview.js"
import type { Interaction } from "./interaction.js"

interface ConversationRow {
  id: string
  title: string
  created_at: Date | string
  updated_at: Date | string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_type: "user" | "teller"
  sender_id: string
  content: string
  reading: unknown
  signature_card: unknown
  search: unknown
  links: unknown
  interaction: unknown
  created_at: Date | string
}

function isoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function asMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    content: row.content,
    createdAt: isoDate(row.created_at),
    ...(row.reading ? { reading: typeof row.reading === "string" ? JSON.parse(row.reading) : row.reading } : {}),
    ...(row.signature_card ? { signatureCard: typeof row.signature_card === "string" ? JSON.parse(row.signature_card) : row.signature_card } : {}),
    ...(row.search ? { search: typeof row.search === "string" ? JSON.parse(row.search) : row.search } : {}),
    ...(row.links ? { links: typeof row.links === "string" ? JSON.parse(row.links) : row.links } : {}),
    ...(row.interaction ? { interaction: typeof row.interaction === "string" ? JSON.parse(row.interaction) : row.interaction } : {}),
  }
}

export class PostgresChatStore implements ChatStore {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_tellers (
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        teller_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (conversation_id, teller_id)
      )
    `)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        sequence BIGSERIAL NOT NULL,
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'teller')),
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        reading JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await this.pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reading JSONB")
    await this.pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS signature_card JSONB")
    await this.pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS search JSONB")
    await this.pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS links JSONB")
    await this.pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS interaction JSONB")
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS messages_conversation_sequence_idx
      ON messages (conversation_id, sequence)
    `)
  }

  async createConversation(input: CreateConversationInput): Promise<ChatConversation> {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      await client.query("INSERT INTO conversations (id, title) VALUES ($1, $2)", [input.id, input.title])
      for (const [position, tellerId] of input.tellerIds.entries()) {
        await client.query(
          "INSERT INTO conversation_tellers (conversation_id, teller_id, position) VALUES ($1, $2, $3)",
          [input.id, tellerId, position],
        )
      }
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }

    const conversation = await this.getConversation(input.id)
    if (!conversation) throw new Error("Conversation was not created")
    return conversation
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const { rows } = await this.pool.query<ConversationRow>(
      "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC, id",
    )
    return Promise.all(rows.map(async (row) => {
      const [tellerIds, lastMessage] = await Promise.all([this.getTellerIds(row.id), this.getLastMessage(row.id)])
      return {
        id: row.id,
        title: row.title,
        tellerIds,
        createdAt: isoDate(row.created_at),
        updatedAt: isoDate(row.updated_at),
        ...(lastMessage ? { lastMessage } : {}),
      }
    }))
  }

  private async getLastMessage(conversationId: string): Promise<LastMessage | undefined> {
    const { rows } = await this.pool.query<Pick<MessageRow, "sender_type" | "sender_id" | "content" | "created_at">>(
      "SELECT sender_type, sender_id, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY sequence DESC LIMIT 1",
      [conversationId],
    )
    const row = rows[0]
    return row ? { senderType: row.sender_type, senderId: row.sender_id, preview: previewText(row.content), createdAt: isoDate(row.created_at) } : undefined
  }

  async getConversation(id: string): Promise<ChatConversation | null> {
    const result = await this.pool.query<ConversationRow>(
      "SELECT id, title, created_at, updated_at FROM conversations WHERE id = $1",
      [id],
    )
    const row = result.rows[0]
    if (!row) return null

    const [tellerIds, messageResult] = await Promise.all([
      this.getTellerIds(id),
      this.pool.query<MessageRow>(
        "SELECT id, conversation_id, sender_type, sender_id, content, reading, signature_card, search, links, interaction, created_at FROM messages WHERE conversation_id = $1 ORDER BY sequence",
        [id],
      ),
    ])

    return {
      id: row.id,
      title: row.title,
      tellerIds,
      createdAt: isoDate(row.created_at),
      updatedAt: isoDate(row.updated_at),
      messages: messageResult.rows.map(asMessage),
    }
  }

  async appendMessage(input: AppendMessageInput): Promise<ChatMessage> {
    const result = await this.pool.query<MessageRow>(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, reading, signature_card, search, links, interaction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, conversation_id, sender_type, sender_id, content, reading, signature_card, search, links, interaction, created_at`,
      [input.id, input.conversationId, input.senderType, input.senderId, input.content, input.reading ? JSON.stringify(input.reading) : null, input.signatureCard ? JSON.stringify(input.signatureCard) : null, input.search ? JSON.stringify(input.search) : null, input.links ? JSON.stringify(input.links) : null, input.interaction ? JSON.stringify(input.interaction) : null],
    )
    await this.pool.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [input.conversationId])
    const row = result.rows[0]
    if (!row) throw new Error("Message was not created")
    return asMessage(row)
  }

  async updateInteraction(messageId: string, expectedState: string, next: Interaction, reading?: { reading: ChatMessage["reading"]; signatureCard?: ChatMessage["signatureCard"] }): Promise<boolean> {
    // A reveal also saves the dealt reading and signature card on the same message, in the same statement.
    const result = reading
      ? await this.pool.query(
        "UPDATE messages SET interaction = $1, reading = $2, signature_card = $3 WHERE id = $4 AND interaction->>'state' = $5 RETURNING id",
        [JSON.stringify(next), JSON.stringify(reading.reading), reading.signatureCard ? JSON.stringify(reading.signatureCard) : null, messageId, expectedState],
      )
      : await this.pool.query(
        "UPDATE messages SET interaction = $1 WHERE id = $2 AND interaction->>'state' = $3 RETURNING id",
        [JSON.stringify(next), messageId, expectedState],
      )
    return (result.rowCount ?? result.rows.length) > 0
  }

  async deleteAllConversations(): Promise<void> {
    await this.pool.query("DELETE FROM conversations")
  }

  async deleteConversation(id: string): Promise<void> {
    await this.pool.query("DELETE FROM conversations WHERE id = $1", [id])
  }

  async renameConversation(id: string, title: string): Promise<void> {
    await this.pool.query("UPDATE conversations SET title = $2, updated_at = NOW() WHERE id = $1", [id, title])
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  private async getTellerIds(conversationId: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ teller_id: string }>(
      "SELECT teller_id FROM conversation_tellers WHERE conversation_id = $1 ORDER BY position",
      [conversationId],
    )
    return rows.map((row) => row.teller_id)
  }
}
