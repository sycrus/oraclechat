/** Reads the chat turn's server-sent events (`data: {...}` blocks) and throws on an error event. */
export async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (event: Record<string, unknown> & { type: string }) => void): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split("\n\n")
    buffer = done ? "" : blocks.pop() ?? ""
    for (const block of blocks) {
      const line = block.split("\n").find((entry) => entry.startsWith("data: "))
      if (!line) continue
      const event = JSON.parse(line.slice(6)) as Record<string, unknown> & { type: string }
      if (event.type === "error") throw new Error(typeof event.error === "string" ? event.error : "The reply failed")
      onEvent(event)
    }
    if (done) return
  }
}
