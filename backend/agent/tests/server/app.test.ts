import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import { createApp } from "../../src/server/app.js"
import { newDb } from "pg-mem"
import { PostgresChatStore } from "../../src/chat/store.js"
import { ChatService } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"
import type { Pool } from "pg"
import { PostgresMemoryStore } from "../../src/memory/store.js"
import { MemoryService } from "../../src/memory/service.js"
import { NO_CALL_TELLER } from "../tellers/no-call-teller.js"

describe("agent HTTP service", () => {
  let server: Server
  let baseUrl: string
  let chatService: ChatService
  let memoryService: MemoryService

  beforeAll(async () => {
    const database = newDb()
    const { Pool: MemoryPool } = database.adapters.createPg()
    const pool = new MemoryPool() as unknown as Pool
    const store = new PostgresChatStore(pool)
    await store.initialize()
    const memoryStore = new PostgresMemoryStore(pool)
    await memoryStore.initialize()
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    registry.register(NO_CALL_TELLER)
    chatService = new ChatService({
      store,
      registry,
      // One-to-one turns get a route; group turns get none, to exercise the failure path.
      route: async (input) => input.tellers.length === 1 ? [{ tellerId: input.tellers[0]!.id, score: 1, matchedCategories: [], reading: "none" }] : [],
      stream: async (request, onChunk) => {
        const text = `Reply from ${request.name}`
        onChunk(text)
        return text
      },
      memory: (memoryService = new MemoryService(memoryStore)),
    })
    server = createApp(chatService).listen(0, "127.0.0.1")
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve)
      server.once("error", reject)
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  it("reports the service as healthy", async () => {
    const response = await fetch(`${baseUrl}/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "ok" })
  })

  it("creates, lists, opens, and streams a one-to-one conversation", async () => {
    const create = await fetch(`${baseUrl}/api/conversations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tellerIds: ["mira-the-mystic"] }),
    })
    expect(create.status).toBe(201)
    const conversation = await create.json() as { id: string }
    expect((await (await fetch(`${baseUrl}/api/conversations`)).json()).length).toBe(1)
    expect((await fetch(`${baseUrl}/api/conversations/${conversation.id}`)).status).toBe(200)

    const stream = await fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Hello" }),
    })
    const body = await stream.text()
    expect(stream.headers.get("content-type")).toContain("text/event-stream")
    expect(body).toContain('"type":"message_chunk"')
    expect(body).toContain('"senderId":"mira-the-mystic"')
  })

  it("streams a failed turn as an error event carrying the reason in `error`", async () => {
    const create = await fetch(`${baseUrl}/api/conversations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tellerIds: ["mira-the-mystic", "sage-the-seer"] }),
    })
    const conversation = await create.json() as { id: string }

    const body = await (await fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Hello" }),
    })).text()

    const error = body.split("\n\n").map((block) => block.replace(/^data: /, "")).filter(Boolean)
      .map((json) => JSON.parse(json) as { type: string; error?: string }).find((event) => event.type === "error")
    expect(error?.error).toBe("Router did not select a conversation teller")
  })

  it("accepts a plain message and rejects composer-chosen readings or searches", async () => {
    const conversation = await (await fetch(`${baseUrl}/api/conversations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tellerIds: ["sage-the-seer"] }),
    })).json() as { id: string }
    const send = (body: unknown) => fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    expect((await send({ content: "Hi" })).status).toBe(200)
    for (const extra of [{ spread: "three-card" }, { spread: "none" }, { search: true }, { search: false }]) {
      const rejected = await send({ content: "Hi", ...extra })
      expect(rejected.status).toBe(400)
      expect(await rejected.json()).toEqual({ error: "readings and lookups are chosen by the tellers" })
    }
  })

  it("streams spoken sentences for call messages and rejects calls that cannot happen", async () => {
    const open = async (tellerIds: string[]) => (await (await fetch(`${baseUrl}/api/conversations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tellerIds }),
    })).json() as { id: string }).id
    const send = (id: string, body: unknown) => fetch(`${baseUrl}/api/conversations/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })

    const mira = await open(["mira-the-mystic"])
    const spoken = await send(mira, { content: "Hi", call: true })
    expect(spoken.status).toBe(200)
    expect(await spoken.text()).toContain('"type":"sentence"')

    expect((await send(mira, { content: "Hi", call: "yes" })).status).toBe(400)
    const noCalls = await send(await open([NO_CALL_TELLER.id]), { content: "Hi", call: true })
    expect(noCalls.status).toBe(400)
    expect(await noCalls.json()).toEqual({ error: "Only one-to-one conversations with a callable teller support calls" })
  })

  it("clears all conversations", async () => {
    await fetch(`${baseUrl}/api/conversations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tellerIds: ["sage-the-seer"] }) })
    const cleared = await fetch(`${baseUrl}/api/conversations`, { method: "DELETE" })
    expect(cleared.status).toBe(204)
    expect(await (await fetch(`${baseUrl}/api/conversations`)).json()).toEqual([])
  })

  it("pins a memory as core and rejects invalid memory edits", async () => {
    const put = (body: unknown) => fetch(`${baseUrl}/api/memory/consent`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const patch = (id: string, body: unknown) => fetch(`${baseUrl}/api/memory/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    await put({ consented: true })
    const conversation = await (await fetch(`${baseUrl}/api/conversations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tellerIds: ["sage-the-seer"] }),
    })).json() as { id: string }
    await memoryService.apply([{ op: "add", content: "Name is Jo", kind: "detail", entities: ["jo"] }], conversation.id)
    const [saved] = (await (await fetch(`${baseUrl}/api/memory`)).json()).memories as Array<{ id: string }>

    const pinned = await patch(saved!.id, { kind: "core" })
    expect(pinned.status).toBe(200)
    expect(await pinned.json()).toMatchObject({ content: "Name is Jo", kind: "core", entities: ["jo"] })
    expect((await patch(saved!.id, {})).status).toBe(400)
    expect((await patch(saved!.id, { kind: "favourite" })).status).toBe(400)
    await put({ consented: false })
  })

  it("requires explicit memory consent and deletes memory when consent is revoked", async () => {
    const initial = await (await fetch(`${baseUrl}/api/memory`)).json()
    expect(initial).toMatchObject({ consented: false, memories: [] })
    await fetch(`${baseUrl}/api/memory/consent`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consented: true }),
    })
    expect(await (await fetch(`${baseUrl}/api/memory`)).json()).toMatchObject({ consented: true })
    await fetch(`${baseUrl}/api/memory/consent`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consented: false }),
    })
    expect(await (await fetch(`${baseUrl}/api/memory`)).json()).toMatchObject({ consented: false, memories: [] })
  })

  it("reports hosted replies and refuses hosted sharing when no hosted provider is configured", async () => {
    expect(await (await fetch(`${baseUrl}/api/memory`)).json()).toMatchObject({ hostedReplies: false, hostedConsented: false })
    const put = (body: unknown) => fetch(`${baseUrl}/api/memory/hosted-consent`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    expect((await put({ consented: "yes" })).status).toBe(400)
    const refused = await put({ consented: true })
    expect(refused.status).toBe(400)
    expect(await refused.json()).toEqual({ error: "hosted replies are not configured" })
  })

  it("lets the user share memories with a configured hosted provider only after memory is on", async () => {
    const database = newDb()
    const { Pool: HostedPool } = database.adapters.createPg()
    const pool = new HostedPool() as unknown as Pool
    const store = new PostgresChatStore(pool)
    await store.initialize()
    const memoryStore = new PostgresMemoryStore(pool)
    await memoryStore.initialize()
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    const memory = new MemoryService(memoryStore)
    const hosted = new ChatService({ store, registry, memory, hostedReplies: true, route: async () => [], stream: async () => "ok" })
    const hostedServer = createApp(hosted).listen(0, "127.0.0.1")
    await new Promise((resolve) => hostedServer.once("listening", resolve))
    try {
      const url = `http://127.0.0.1:${(hostedServer.address() as AddressInfo).port}`
      const put = (body: unknown) => fetch(`${url}/api/memory/hosted-consent`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const early = await put({ consented: true })
      expect(early.status).toBe(400)
      expect(await early.json()).toEqual({ error: "memory must be on first" })

      await memory.setConsent(true)
      const accepted = await put({ consented: true })
      expect(accepted.status).toBe(200)
      expect(await accepted.json()).toEqual({ hostedConsented: true })
      expect(await (await fetch(`${url}/api/memory`)).json()).toMatchObject({ consented: true, hostedReplies: true, hostedConsented: true })
    } finally {
      hostedServer.close()
    }
  })
})
