import { describe, expect, it } from "vitest"
import { readEvents } from "./events"

function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({ start(controller) { parts.forEach((part) => controller.enqueue(encoder.encode(part))); controller.close() } })
}

describe("readEvents", () => {
  it("parses events split across network chunks, in order", async () => {
    const events: unknown[] = []
    await readEvents(streamOf('data: {"type":"sentence","text":"Yes."}\n\nda', 'ta: {"type":"message_complete"}\n', "\n"), (event) => events.push(event))
    expect(events).toEqual([{ type: "sentence", text: "Yes." }, { type: "message_complete" }])
  })

  it("throws the reason carried by an error event", async () => {
    await expect(readEvents(streamOf('data: {"type":"error","error":"Router failed"}\n\n'), () => undefined)).rejects.toThrow("Router failed")
  })
})
