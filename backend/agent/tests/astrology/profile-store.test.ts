import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { beforeEach, describe, expect, it } from "vitest"
import { PostgresBirthProfileStore } from "../../src/astrology/profile-store.js"

describe("birth profile store", () => {
  let pool: Pool
  let store: PostgresBirthProfileStore
  const profile = { date: "1990-07-01", time: "12:00", placeId: 5391959 }

  beforeEach(async () => {
    const { Pool: MemoryPool } = newDb().adapters.createPg()
    pool = new MemoryPool() as unknown as Pool
    store = new PostgresBirthProfileStore(pool)
    await store.initialize()
  })

  it("has no profile until one is saved", async () => {
    expect(await store.get()).toBeUndefined()
  })

  it("saves one profile that survives a new store instance", async () => {
    await store.save(profile)
    // A fresh store over the same database (pg-mem can't re-run CREATE TABLE IF NOT EXISTS on an existing table).
    const reopened = new PostgresBirthProfileStore(pool)
    expect(await reopened.get()).toEqual(profile)
  })

  it("replaces the profile on a second save", async () => {
    await store.save(profile)
    await store.save({ ...profile, time: "06:15" })
    expect(await store.get()).toEqual({ ...profile, time: "06:15" })
  })

  it("deletes the profile", async () => {
    await store.save(profile)
    await store.delete()
    expect(await store.get()).toBeUndefined()
  })
})
