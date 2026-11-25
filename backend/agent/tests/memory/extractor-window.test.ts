import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { extractMemoryOperations } from "../../src/memory/extractor.js"

describe("memory distiller input window", () => {
  let server: Server
  let config: { baseURL: string; model: string }
  const bodies: Array<{ messages: Array<{ role: string; content: string }> }> = []

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = ""
      request.on("data", (chunk) => { body += chunk })
      request.on("end", () => {
        bodies.push(JSON.parse(body))
        response.writeHead(200, { "content-type": "application/json" })
        response.end(JSON.stringify({
          id: "chatcmpl-test", object: "chat.completion", created: 1, model: "fixture-model",
          choices: [{ index: 0, message: { role: "assistant", content: "[]" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    config = { baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, model: "fixture-model" }
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it("sends only the user's three most recent messages", async () => {
    await extractMemoryOperations({
      userMessages: ["I grew up in Lisbon.", "I have a cat named Pip.", "I just started as a nurse.", "I moved to Osaka."],
      tellers: [], knownTellerIds: [], existing: [],
    }, config)
    const input = bodies.at(-1)!.messages.find((message) => message.role === "user")!.content
    expect(JSON.parse(input).userMessages).toEqual(["I have a cat named Pip.", "I just started as a nurse.", "I moved to Osaka."])
    expect(input).not.toContain("Lisbon")
  })
})
