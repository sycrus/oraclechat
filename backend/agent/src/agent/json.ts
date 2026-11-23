/** Return the first complete, bracket-balanced JSON array in a model response (ignoring brackets inside strings). */
export function extractJsonArray(response: string, label = "Model response"): string {
  const start = response.indexOf("[")
  if (start < 0) throw new Error(`${label} must include a JSON array`)

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < response.length; index += 1) {
    const character = response[index]!
    if (inString) {
      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === "[") depth += 1
    else if (character === "]") {
      depth -= 1
      if (depth === 0) return response.slice(start, index + 1)
    }
  }
  throw new Error(`${label} contains an incomplete JSON array`)
}
