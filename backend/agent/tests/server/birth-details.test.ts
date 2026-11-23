import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import type { Pool } from "pg"
import { newDb } from "pg-mem"
import { createApp } from "../../src/server/app.js"
import { PostgresBirthProfileStore } from "../../src/astrology/profile-store.js"
import { PostgresChatStore } from "../../src/chat/store.js"
import { PostgresMemoryStore } from "../../src/memory/store.js"
import { searchPlaces } from "../../src/astrology/places.js"

describe("birth details HTTP routes", () => {
  let server: Server
  let baseUrl: string
  let memoryStore: PostgresMemoryStore
  const sanFrancisco = searchPlaces("san francisco")[0]!
  const valid = { date: "1990-07-01", time: "12:00", placeId: sanFrancisco.id, consent: true }
  const put = (body: unknown) => fetch(`${baseUrl}/api/birth-details`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  const get = async () => (await fetch(`${baseUrl}/api/birth-details`)).json()

  beforeAll(async () => {
    const { Pool: MemoryPool } = newDb().adapters.createPg()
    const pool = new MemoryPool() as unknown as Pool
    await new PostgresChatStore(pool).initialize()
    memoryStore = new PostgresMemoryStore(pool)
    await memoryStore.initialize()
    const birthProfiles = new PostgresBirthProfileStore(pool)
    await birthProfiles.initialize()
    server = createApp(undefined, { birthProfiles }).listen(0, "127.0.0.1")
    await new Promise<void>((resolve) => server.once("listening", resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it("searches places", async () => {
    const response = await fetch(`${baseUrl}/api/places?q=san%20fr`)
    expect(response.status).toBe(200)
    const { places } = await response.json()
    expect(places).toContainEqual(sanFrancisco)
  })

  it("has no profile at first", async () => {
    expect(await get()).toEqual({ profile: null })
  })

  it("rejects a save without consent and saves nothing", async () => {
    const response = await put({ ...valid, consent: false })
    expect(response.status).toBe(400)
    expect(await get()).toEqual({ profile: null })
  })

  it("saves with consent, with memory consent off, and creates no memory", async () => {
    expect(await memoryStore.hasConsent()).toBe(false)
    const response = await put(valid)
    expect(response.status).toBe(200)
    expect(await get()).toEqual({ profile: { date: "1990-07-01", time: "12:00", place: sanFrancisco } })
    expect(await memoryStore.list()).toEqual([])
  })

  it("rejects invalid fields and keeps the saved profile", async () => {
    expect((await put({ ...valid, date: "1990-02-30" })).status).toBe(400)
    expect((await put({ ...valid, placeId: -1 })).status).toBe(400)
    expect((await get()).profile.date).toBe("1990-07-01")
  })

  it("deletes the profile", async () => {
    const response = await fetch(`${baseUrl}/api/birth-details`, { method: "DELETE" })
    expect(response.status).toBe(204)
    expect(await get()).toEqual({ profile: null })
  })
})
