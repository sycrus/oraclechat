import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createOllamaEmbedder } from "../../src/memory/embedder.js"

describe("local Ollama embedder", () => {
  let server: Server
  const requests: Array<{ url?: string; body: { model: string; input: string[] } }> = []

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = ""
      request.on("data", (chunk) => { body += chunk })
      request.on("end", () => {
        const parsed = JSON.parse(body) as { model: string; input: string[] }
        requests.push({ url: request.url, body: parsed })
        response.writeHead(200, { "content-type": "application/json" })
        response.end(JSON.stringify({ data: parsed.input.map((_, index) => ({ index, embedding: [index, 0.5] })) }))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it("posts texts to the configured Ollama embeddings endpoint and returns vectors in order", async () => {
    const port = (server.address() as AddressInfo).port
    const embed = createOllamaEmbedder({ baseURL: `http://127.0.0.1:${port}/v1`, model: "nomic-embed-text" })

    expect(await embed(["a", "b"])).toEqual([[0, 0.5], [1, 0.5]])
    expect(requests[0]).toEqual({ url: "/v1/embeddings", body: { model: "nomic-embed-text", input: ["a", "b"] } })
  })
})
