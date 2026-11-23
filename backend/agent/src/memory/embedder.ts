/** Turns texts into vectors, in the same order. */
export type Embed = (texts: string[]) => Promise<number[][]>

export interface EmbedderConfig {
  baseURL: string
  model: string
}

export function loadEmbedderConfig(env: NodeJS.ProcessEnv = process.env): EmbedderConfig {
  return {
    baseURL: env["OLLAMA_BASE_URL"]?.trim() || "http://127.0.0.1:11434/v1",
    model: env["OLLAMA_EMBED_MODEL"]?.trim() || "nomic-embed-text",
  }
}

/** Local Ollama embeddings via its OpenAI-compatible endpoint; never a hosted service (ADR-0002, ADR-0009). */
export function createOllamaEmbedder(config: EmbedderConfig = loadEmbedderConfig()): Embed {
  return async (texts) => {
    if (texts.length === 0) return []
    const response = await fetch(`${config.baseURL.replace(/\/+$/, "")}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, input: texts }),
    })
    if (!response.ok) throw new Error(`Embedding request failed with ${response.status}`)
    const body = await response.json() as { data: Array<{ index: number; embedding: number[] }> }
    return [...body.data].sort((left, right) => left.index - right.index).map((entry) => entry.embedding)
  }
}

export function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    dot += left[index]! * right[index]!
    leftNorm += left[index]! ** 2
    rightNorm += right[index]! ** 2
  }
  return leftNorm === 0 || rightNorm === 0 ? 0 : dot / Math.sqrt(leftNorm * rightNorm)
}
