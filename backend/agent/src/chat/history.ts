export const HISTORY_OMITTED = "(Earlier conversation omitted.)"
export const DEFAULT_HISTORY_TOKEN_BUDGET = 8000

/** Rough token estimate (about 4 characters per token); good enough for a safety budget. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Keep the newest lines that fit the budget. The newest line is always kept; a marker shows when anything was dropped. */
export function boundHistory(lines: string[], budgetTokens: number): string[] {
  const kept: string[] = []
  let used = 0
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const cost = estimateTokens(lines[index]!)
    if (kept.length > 0 && used + cost > budgetTokens) break
    kept.unshift(lines[index]!)
    used += cost
  }
  return kept.length < lines.length ? [HISTORY_OMITTED, ...kept] : kept
}
