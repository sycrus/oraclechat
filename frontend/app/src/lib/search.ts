export interface SearchResult {
  title: string
  url: string
  description: string
}

export interface SearchOutcome {
  results: SearchResult[]
  error?: string
}

/** Keeps at most five results with a title and an http(s) URL; anything else is dropped. */
export function parseSearchResults(value: unknown): SearchResult[] {
  if (!Array.isArray(value)) return []
  const results: SearchResult[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const result = item as Record<string, unknown>
    if (typeof result.title !== "string" || !result.title.trim()
        || typeof result.url !== "string" || !/^https?:\/\//i.test(result.url)) continue
    results.push({ title: result.title, url: result.url, description: typeof result.description === "string" ? result.description : "" })
    if (results.length === 5) break
  }
  return results
}

export interface Sources {
  /** The query a teller chose; absent on older user-triggered searches. */
  query?: string
  results: SearchResult[]
  error?: string
}

/** A teller's `{ query, results, error? }` lookup, or the plain result list stored on older user messages. */
export function parseSources(value: unknown): Sources | undefined {
  if (Array.isArray(value)) {
    const results = parseSearchResults(value)
    return results.length ? { results } : undefined
  }
  if (!value || typeof value !== "object") return undefined
  const lookup = value as Record<string, unknown>
  if (typeof lookup.query !== "string" || !Array.isArray(lookup.results)) return undefined
  return { query: lookup.query, results: parseSearchResults(lookup.results), ...(typeof lookup.error === "string" ? { error: lookup.error } : {}) }
}

export interface LinkRef {
  url: string
  title?: string
  error?: string
}

/** Links from the user's message that were read (with a title) or couldn't be opened (with an error); http(s) only, at most two. */
export function parseLinks(value: unknown): LinkRef[] {
  if (!Array.isArray(value)) return []
  const links: LinkRef[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const link = item as Record<string, unknown>
    if (typeof link.url !== "string" || !/^https?:\/\//i.test(link.url)) continue
    if (typeof link.title === "string") links.push({ url: link.url, title: link.title })
    else if (typeof link.error === "string") links.push({ url: link.url, error: link.error })
    else continue
    if (links.length === 2) break
  }
  return links
}
