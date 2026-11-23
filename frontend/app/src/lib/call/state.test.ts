import { describe, expect, it } from "vitest"
import { callReducer, initialCallState, validateSentence, type CallEvent, type CallState } from "./state"

const run = (...events: CallEvent[]): CallState => events.reduce(callReducer, initialCallState)
const line = (text: string, expression: "neutral" | "happy" | "sad" = "neutral") => ({ text, expression })

describe("call state machine", () => {
  it("starts idle with a neutral expression", () => {
    expect(initialCallState).toEqual({ body: "idle", expression: "neutral", queue: [] })
  })

  it("goes idle → speaking → idle around one sentence", () => {
    const queued = run({ type: "say", text: "Hello, I'm Mira" })
    expect(queued).toMatchObject({ body: "idle", current: line("Hello, I'm Mira"), queue: [] })

    const speaking = callReducer(queued, { type: "audioStarted" })
    expect(speaking).toMatchObject({ body: "speaking", current: line("Hello, I'm Mira") })

    expect(callReducer(speaking, { type: "audioEnded" })).toEqual(initialCallState)
  })

  it("queues sentences said while speaking and plays them in order", () => {
    let state = run({ type: "say", text: "one" }, { type: "audioStarted" }, { type: "say", text: "two" }, { type: "say", text: "three" })
    expect(state).toMatchObject({ body: "speaking", current: line("one"), queue: [line("two"), line("three")] })

    state = callReducer(state, { type: "audioEnded" })
    expect(state).toMatchObject({ body: "idle", current: line("two"), queue: [line("three")] })
    state = callReducer(callReducer(state, { type: "audioStarted" }), { type: "audioEnded" })
    expect(state).toMatchObject({ current: line("three"), queue: [] })
  })

  it("moves on to the next sentence when audio fails", () => {
    const state = run({ type: "say", text: "one" }, { type: "say", text: "two" }, { type: "audioFailed" })
    expect(state).toMatchObject({ body: "idle", current: line("two"), queue: [] })
  })

  it("ignores everything after the call ends", () => {
    const ended = run({ type: "say", text: "one" }, { type: "audioStarted" }, { type: "end" })
    expect(ended).toEqual({ body: "ended", expression: "neutral", queue: [] })
    expect(callReducer(ended, { type: "say", text: "again" })).toBe(ended)
    expect(callReducer(ended, { type: "think" })).toBe(ended)
  })

  it("ignores audio events with nothing to play", () => {
    expect(callReducer(initialCallState, { type: "audioStarted" })).toBe(initialCallState)
    expect(callReducer(initialCallState, { type: "audioEnded" })).toBe(initialCallState)
  })
})

describe("thinking and expressions", () => {
  it("thinks after a message is sent until the first sentence plays", () => {
    const thinking = run({ type: "think" })
    expect(thinking.body).toBe("thinking")

    const firstSentence = callReducer(thinking, { type: "say", text: "Yes.", expression: "happy" })
    expect(firstSentence).toMatchObject({ body: "thinking", current: line("Yes.", "happy") })

    expect(callReducer(firstSentence, { type: "audioStarted" })).toMatchObject({ body: "speaking", expression: "happy" })
  })

  it("only starts thinking from a quiet idle", () => {
    const speaking = run({ type: "say", text: "one" }, { type: "audioStarted" })
    expect(callReducer(speaking, { type: "think" })).toBe(speaking)
  })

  it("shows each sentence's expression while it plays and returns to neutral when idle", () => {
    let state = run({ type: "say", text: "Yes.", expression: "happy" }, { type: "say", text: "But.", expression: "sad" }, { type: "audioStarted" })
    expect(state.expression).toBe("happy")
    state = callReducer(callReducer(state, { type: "audioEnded" }), { type: "audioStarted" })
    expect(state.expression).toBe("sad")
    expect(callReducer(state, { type: "audioEnded" })).toEqual(initialCallState)
  })

  it("returns to idle when a turn ends without any sentence", () => {
    expect(run({ type: "think" }, { type: "turnEnded" })).toEqual(initialCallState)
  })

  it("keeps speaking queued sentences when the turn ends", () => {
    const state = run({ type: "think" }, { type: "say", text: "one" }, { type: "turnEnded" })
    expect(state).toMatchObject({ body: "thinking", current: line("one") })
  })
})

describe("sentence validation", () => {
  it("accepts a trimmed sentence up to 500 characters", () => {
    expect(validateSentence("  Hello  ")).toEqual({ ok: true, text: "Hello" })
    expect(validateSentence("a".repeat(500)).ok).toBe(true)
  })

  it("stops speaking and drops the rest of the turn when interrupted", () => {
    const state = run(
      { type: "think" }, { type: "say", text: "one", expression: "happy" }, { type: "audioStarted" },
      { type: "say", text: "two" }, { type: "interrupt", streaming: true },
    )
    expect(state).toMatchObject({ body: "idle", expression: "neutral", queue: [], dropTurn: true })
    expect(state.current).toBeUndefined()
  })

  it("ignores sentences from the interrupted stream until that turn ends", () => {
    const interrupted = run({ type: "think" }, { type: "interrupt", streaming: true }, { type: "say", text: "late sentence" })
    expect(interrupted.current).toBeUndefined()
    expect(interrupted.queue).toEqual([])

    const next = run({ type: "think" }, { type: "interrupt", streaming: true }, { type: "turnEnded" }, { type: "think" }, { type: "say", text: "new reply" })
    expect(next).toMatchObject({ body: "thinking", current: line("new reply") })
    expect(next.dropTurn).toBeUndefined()
  })

  it("does not drop the next reply when the interrupted turn had already finished streaming", () => {
    const state = run(
      { type: "think" }, { type: "say", text: "one" }, { type: "turnEnded" }, { type: "audioStarted" },
      { type: "interrupt", streaming: false }, { type: "think" }, { type: "say", text: "next reply" },
    )
    expect(state).toMatchObject({ body: "thinking", current: line("next reply") })
    expect(state.dropTurn).toBeUndefined()
  })

  it("ignores audio events after an interrupt", () => {
    const state = run({ type: "say", text: "one" }, { type: "audioStarted" }, { type: "interrupt", streaming: true }, { type: "audioEnded" })
    expect(state).toMatchObject({ body: "idle", queue: [] })
  })

  it("rejects empty and over-long input", () => {
    expect(validateSentence("   ")).toMatchObject({ ok: false })
    expect(validateSentence("a".repeat(501))).toEqual({ ok: false, error: "Keep it under 500 characters." })
  })
})
