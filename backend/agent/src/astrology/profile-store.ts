/** The one local birth profile (ADR-0018). Kept apart from memory: no consent coupling, no embeddings, no recall. */
import type { Pool } from "pg"
import type { BirthProfile } from "./details.js"

export interface BirthProfileStore {
  get(): Promise<BirthProfile | undefined>
  save(profile: BirthProfile): Promise<void>
  delete(): Promise<void>
}

const USER = "local-user"

export class PostgresBirthProfileStore implements BirthProfileStore {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS birth_profile (
      user_id TEXT PRIMARY KEY,
      birth_date TEXT NOT NULL,
      birth_time TEXT NOT NULL,
      place_id INTEGER NOT NULL,
      consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
  }

  async get(): Promise<BirthProfile | undefined> {
    const result = await this.pool.query<{ birth_date: string; birth_time: string; place_id: number }>("SELECT birth_date, birth_time, place_id FROM birth_profile WHERE user_id = $1", [USER])
    const row = result.rows[0]
    return row ? { date: row.birth_date, time: row.birth_time, placeId: Number(row.place_id) } : undefined
  }

  /** Saving is the consent: callers only reach here with a request whose consent was `true`. */
  async save(profile: BirthProfile): Promise<void> {
    await this.pool.query(
      `INSERT INTO birth_profile (user_id, birth_date, birth_time, place_id, consented_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET birth_date = EXCLUDED.birth_date, birth_time = EXCLUDED.birth_time, place_id = EXCLUDED.place_id, consented_at = NOW(), updated_at = NOW()`,
      [USER, profile.date, profile.time, profile.placeId],
    )
  }

  async delete(): Promise<void> {
    await this.pool.query("DELETE FROM birth_profile WHERE user_id = $1", [USER])
  }
}
