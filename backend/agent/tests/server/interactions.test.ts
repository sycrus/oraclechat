import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import { newDb } from "pg-mem"
import type { Pool } from "pg"
import { createApp } from "../../src/server/app.js"
import { PostgresChatStore } from "../../src/chat/store.js"
import { ChatService } from "../../src/chat/service.js"
import { TellerRegistry } from "../../src/tellers/registry.js"

const MIRA = "mira-the-mystic"

describe("card fan interaction route", () => {
  let server: Server
  let baseUrl: string
  let conversationId: string
  let fanId: string

  const post = (path: string, body: unknown) => fetch(`${baseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const interact = (action: unknown, id = fanId) => post(`/api/conversations/${conversationId}/messages/${id}/interactions`, action)
  const events = async (response: Response) => (await response.text()).split("\n\n").filter(Boolean).map((chunk) => JSON.parse(chunk.replace(/^data: /, "")) as { type: string; message?: { interaction?: unknown; reading?: unknown }; error?: string })

  beforeAll(async () => {
    const { Pool: MemoryPool } = newDb().adapters.createPg()
    const store = new PostgresChatStore(new MemoryPool() as unknown as Pool)
    await store.initialize()
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    const service = new ChatService({
      store, registry,
      route: async (input) => input.tellers.map((teller) => ({ tellerId: teller.id, score: 1, matchedCategories: [], reading: /read/i.test(input.message) ? "named" as const : "none" as const })),
      stream: async (request, onChunk) => { const reply = `${request.name} reads them.`; onChunk(reply); return reply },
    })
    server = createApp(service).listen(0, "127.0.0.1")
    await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject) })
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

    conversationId = ((await (await post("/api/conversations", { tellerIds: [MIRA] })).json()) as { id: string }).id
    await (await post(`/api/conversations/${conversationId}/messages`, { content: "Mira, read for me" })).text()
    const conversation = await (await fetch(`${baseUrl}/api/conversations/${conversationId}`)).json() as { messages: Array<{ id: string; interaction?: unknown }> }
    fanId = conversation.messages.find((message) => message.interaction)!.id
  })

  afterAll(() => new Promise<void>((resolve, reject) => { server.close((error) => (error ? reject(error) : resolve())) }))

  it("serves the conversation with the fan face-down and no cards", async () => {
    const text = await (await fetch(`${baseUrl}/api/conversations/${conversationId}`)).text()
    expect(text).not.toContain("hidden")
    expect(JSON.parse(text).messages.find((message: { id: string }) => message.id === fanId).interaction).toEqual({ kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [] })
  })

  it("rejects bad requests with 400 and unknown messages with 404", async () => {
    expect((await interact({ action: "shuffle" })).status).toBe(400)
    expect((await interact({ action: "pick", index: "1" })).status).toBe(400)
    expect((await interact({ action: "pick", index: 99 })).status).toBe(400)
    expect((await interact({ action: "pick", index: 0 }, "nope")).status).toBe(404)
  })

  it("picks and unpicks with a JSON response of the public message", async () => {
    const picked = await interact({ action: "pick", index: 4 })
    expect(picked.status).toBe(200)
    const { message } = await picked.json() as { message: { interaction: unknown } }
    expect(message.interaction).toEqual({ kind: "card-fan", state: "open", spread: "three-card", size: 9, picks: [4] })
    expect(((await (await interact({ action: "unpick", index: 4 })).json()) as { message: { interaction: { picks: number[] } } }).message.interaction.picks).toEqual([])
  })

  it("answers 409 to an early reveal and a fourth pick", async () => {
    await interact({ action: "pick", index: 0 }); await interact({ action: "pick", index: 1 })
    expect((await interact({ action: "reveal" })).status).toBe(409)
    await interact({ action: "pick", index: 2 })
    expect((await interact({ action: "pick", index: 3 })).status).toBe(409)
  })

  it("streams the reveal as an update followed by the interpretation, then rejects a second reveal", async () => {
    const response = await interact({ action: "reveal" })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/event-stream")
    const streamed = await events(response)
    expect(streamed.map((event) => event.type)).toEqual(["message_update", "message_start", "message_chunk", "message_complete"])
    expect(streamed[0]!.message!.interaction).toMatchObject({ state: "revealed", picks: [0, 1, 2] })
    expect(streamed[0]!.message!.reading).toBeDefined()
    expect(JSON.stringify(streamed)).not.toContain("hidden")

    expect((await interact({ action: "reveal" })).status).toBe(409)
    expect((await interact({ action: "pick", index: 5 })).status).toBe(409)
  })
})
