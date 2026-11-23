import { createServer, type Server } from "node:http"
import { afterEach, describe, expect, it } from "vitest"
import { runLocalAgent } from "../../src/agent/runtime.js"

describe("local Agents SDK runtime", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server?.listening) return
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  it("runs through the configured local OpenAI-compatible endpoint without an OpenAI key", async () => {
    let requestUrl = ""
    let requestBody = ""
    let authorization = ""
    server = createServer((request, response) => {
      requestUrl = request.url ?? ""
      authorization = request.headers.authorization ?? ""
      request.on("data", (chunk: Buffer) => (requestBody += chunk.toString("utf8")))
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" })
        response.end(JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 1,
          model: "fixture-model",
          choices: [{ index: 0, message: { role: "assistant", content: "local response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 2, completion_tokens: 2, total_tokens: 4 },
        }))
      })
    })
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")

    const openAiKey = process.env["OPENAI_API_KEY"]
    delete process.env["OPENAI_API_KEY"]
    let output: string
    try {
      output = await runLocalAgent({
        name: "Fixture teller",
        instructions: "Answer briefly.",
        input: "Say hello.",
      }, {
        baseURL: `http://127.0.0.1:${address.port}/v1`,
        model: "fixture-model",
      })
    } finally {
      if (openAiKey !== undefined) process.env["OPENAI_API_KEY"] = openAiKey
    }

    expect(output).toBe("local response")
    expect(requestUrl).toBe("/v1/chat/completions")
    expect(JSON.parse(requestBody).model).toBe("fixture-model")
    expect(authorization).toBe("Bearer ollama")
  })

  it("returns a local-provider error when the local endpoint fails", async () => {
    let requestCount = 0
    server = createServer((_request, response) => {
      requestCount += 1
      response.writeHead(503, { "content-type": "application/json" })
      response.end(JSON.stringify({ error: { message: "local model is unavailable" } }))
    })
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")

    await expect(runLocalAgent({
      name: "Fixture teller",
      instructions: "Answer briefly.",
      input: "Say hello.",
    }, {
      baseURL: `http://127.0.0.1:${address.port}/v1`,
      model: "fixture-model",
    })).rejects.toThrow()

    expect(requestCount).toBeGreaterThan(0)
  })
})
