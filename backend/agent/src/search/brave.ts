export interface SearchResult {
  title: string
  url: string
  description: string
}

export type WebSearch = (query: string) => Promise<SearchResult[]>

export interface BraveSearchConfig {
  apiKey: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const ENDPOINT = "https://api.search.brave.com/res/v1/web/search"
const MAX_RESULTS = 5
const MAX_QUERY_LENGTH = 400
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " }

function clean(text: unknown): string {
  if (typeof text !== "string") return ""
  return text.replace(/<[^>]*>/g, "").replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => ENTITIES[entity] ?? entity).replace(/\s+/g, " ").trim()
}

/** Brave Search API client. Errors never include the API key. */
export function createBraveSearch(config: BraveSearchConfig): WebSearch {
  const doFetch = config.fetchImpl ?? fetch
  const timeoutMs = config.timeoutMs ?? 8000
  return async (query) => {
    const url = new URL(ENDPOINT)
    url.searchParams.set("q", query.slice(0, MAX_QUERY_LENGTH))
    url.searchParams.set("count", String(MAX_RESULTS))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await doFetch(url, {
        headers: { Accept: "application/json", "X-Subscription-Token": config.apiKey },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Web search failed with status ${response.status}`)
      const body = await response.json() as { web?: { results?: unknown[] } }
      const results: SearchResult[] = []
      for (const item of body.web?.results ?? []) {
        const entry = item as Record<string, unknown>
        const link = typeof entry.url === "string" ? entry.url : ""
        if (!/^https?:\/\//i.test(link)) continue
        results.push({ title: clean(entry.title) || link, url: link, description: clean(entry.description) })
        if (results.length === MAX_RESULTS) break
      }
      return results
    } catch (error) {
      if (controller.signal.aborted) throw new Error("Web search timed out")
      throw error instanceof Error && error.message.startsWith("Web search failed")
        ? error
        : new Error("Web search request failed")
    } finally {
      clearTimeout(timer)
    }
  }
}
