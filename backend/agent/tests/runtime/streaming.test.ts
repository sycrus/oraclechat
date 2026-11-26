import { createServer, type Server } from "node:http"
import { afterEach, describe, expect, it } from "vitest"
import { streamLocalAgent } from "../../src/agent/runtime.js"

describe("local agent streaming", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server?.listening) return
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  it("emits text chunks in order from the local provider", async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" })
      for (const content of ["Hello", " there"]) {
        response.write(`data: ${JSON.stringify({
          id: "chatcmpl-stream",
          object: "chat.completion.chunk",
          created: 1,
          model: "fixture-model",
          choices: [{ index: 0, delta: { content }, finish_reason: null }],
        })}\n\n`)
      }
      response.write(`data: ${JSON.stringify({
        id: "chatcmpl-stream",
        object: "chat.completion.chunk",
        created: 1,
        model: "fixture-model",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      })}\n\n`)
      response.end("data: [DONE]\n\n")
    })
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")

    const chunks: string[] = []
    const output = await streamLocalAgent({
      name: "Fixture teller",
      instructions: "Answer briefly.",
      input: "Say hello.",
    }, (chunk) => chunks.push(chunk), {
      baseURL: `http://127.0.0.1:${address.port}/v1`,
      model: "fixture-model",
    })

    expect(chunks.join("")).toBe("Hello there")
    expect(output).toBe("Hello there")
  })

  it("stops on abort without throwing, returning the text streamed so far", async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" })
      response.write(`data: ${JSON.stringify({
        id: "chatcmpl-stream", object: "chat.completion.chunk", created: 1, model: "fixture-model",
        choices: [{ index: 0, delta: { content: "Hello." }, finish_reason: null }],
      })}

`)
      // Never finishes: only the abort can end this reply.
    })
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Expected a TCP address")

    const controller = new AbortController()
    const output = await streamLocalAgent({ name: "Fixture teller", instructions: "Answer briefly.", input: "Say hello.", signal: controller.signal },
      () => controller.abort(),
      { baseURL: `http://127.0.0.1:${address.port}/v1`, model: "fixture-model" })

    expect(output).toBe("Hello.")
    server.closeAllConnections()
  })
})
