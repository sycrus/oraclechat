import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { runLocalAgent } from "../../src/agent/runtime.js"
import { routeTurn } from "../../src/orchestration/router.js"
import { extractMemoryOperations } from "../../src/memory/extractor.js"
import { TellerRegistry } from "../../src/tellers/registry.js"

describe("model thinking control", () => {
  let server: Server
  let config: { baseURL: string; model: string }
  const bodies: Array<Record<string, unknown>> = []
  const authorizations: Array<string | undefined> = []
  let reply = "ok"

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = ""
      request.on("data", (chunk) => { body += chunk })
      request.on("end", () => {
        bodies.push(JSON.parse(body) as Record<string, unknown>)
        authorizations.push(request.headers.authorization)
        response.writeHead(200, { "content-type": "application/json" })
        response.end(JSON.stringify({
          id: "chatcmpl-test", object: "chat.completion", created: 1, model: "fixture-model",
          choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    config = { baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, model: "fixture-model" }
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))
  beforeEach(() => { bodies.length = 0; authorizations.length = 0; reply = "ok" })

  it("asks the endpoint for no reasoning when thinking is off", async () => {
    await runLocalAgent({ name: "T", instructions: "i", input: "x", thinking: false }, config)
    expect(bodies[0]!["reasoning_effort"]).toBe("none")
  })

  it("leaves the model's default reasoning when thinking is not specified", async () => {
    await runLocalAgent({ name: "T", instructions: "i", input: "x" }, config)
    expect(bodies[0]).not.toHaveProperty("reasoning_effort")
  })

  it("asks for schema-constrained JSON at temperature 0 when given an output schema", async () => {
    reply = '{"answer":"yes"}'
    const output = await runLocalAgent({
      name: "T", instructions: "i", input: "x", thinking: false, temperature: 0,
      outputSchema: { name: "fixture", schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] } },
    }, config)
    expect(JSON.parse(output)).toEqual({ answer: "yes" })
    expect(bodies[0]!["temperature"]).toBe(0)
    expect(bodies[0]!["response_format"]).toMatchObject({ type: "json_schema", json_schema: { name: "fixture" } })
  })

  it("sends the hosted key to the hosted endpoint, and the placeholder key to Ollama", async () => {
    await runLocalAgent({ name: "T", instructions: "i", input: "x" }, { ...config, apiKey: "sk-hosted", system: "hosted" })
    await runLocalAgent({ name: "T", instructions: "i", input: "x" }, config)
    expect(authorizations).toEqual(["Bearer sk-hosted", "Bearer ollama"])
  })

  it("sends no response format for plain text requests", async () => {
    await runLocalAgent({ name: "T", instructions: "i", input: "x" }, config)
    expect(bodies[0]).not.toHaveProperty("response_format")
  })

  it("routes turns without thinking, with schema-constrained JSON at temperature 0", async () => {
    const registry = new TellerRegistry()
    await registry.loadFromDirectory("src/tellers/definitions")
    const tellers = [registry.get("mira-the-mystic")!, registry.get("sage-the-seer")!]
    reply = JSON.stringify({ routes: tellers.map((teller) => ({ tellerId: teller.id, score: 0.5, matchedCategories: [], reading: "none", spread: "none", query: "" })) })
    const routes = await routeTurn({ message: "Hello", tellers, previousReplies: [] }, config)
    expect(routes.map((route) => route.reading)).toEqual(["none", "none"])
    expect(bodies[0]!["reasoning_effort"]).toBe("none")
    expect(bodies[0]!["temperature"]).toBe(0)
    expect(bodies[0]!["response_format"]).toMatchObject({ type: "json_schema", json_schema: { name: "turn_routes" } })
  })

  it("extracts memories without thinking", async () => {
    reply = "[]"
    await extractMemoryOperations({ userMessages: ["I live in Osaka."], tellers: [], knownTellerIds: [], existing: [] }, config)
    expect(bodies[0]!["reasoning_effort"]).toBe("none")
  })
})
