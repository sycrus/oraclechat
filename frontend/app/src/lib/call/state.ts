/** The call state machine (ADR-0015). The renderer only plays what this state says. */

export type Body = "idle" | "thinking" | "speaking" | "ended"
export type Expression = "neutral" | "happy" | "relaxed" | "surprised" | "sad"

export interface Line {
  text: string
  expression: Expression
}

export interface CallState {
  body: Body
  /** The face shown now: the playing sentence's expression, otherwise neutral. */
  expression: Expression
  /** The sentence being fetched or spoken. */
  current?: Line
  queue: Line[]
  /** The owner interrupted: sentences still streaming from that turn are dropped until it ends. */
  dropTurn?: true
}

export type CallEvent =
  | { type: "think" }
  | { type: "say"; text: string; expression?: Expression }
  | { type: "audioStarted" }
  | { type: "audioEnded" }
  | { type: "audioFailed" }
  | { type: "turnEnded" }
  /** streaming: the interrupted turn is still streaming, so its later sentences must be dropped. */
  | { type: "interrupt"; streaming: boolean }
  | { type: "end" }

export const initialCallState: CallState = { body: "idle", expression: "neutral", queue: [] }

function next(state: CallState): CallState {
  const [current, ...queue] = state.queue
  return { body: "idle", expression: "neutral", queue, ...(current ? { current } : {}) }
}

export function callReducer(state: CallState, event: CallEvent): CallState {
  if (state.body === "ended") return state
  switch (event.type) {
    case "think":
      return state.body === "idle" && !state.current ? { ...state, body: "thinking" } : state
    case "say": {
      if (state.dropTurn) return state
      const line: Line = { text: event.text, expression: event.expression ?? "neutral" }
      return state.current ? { ...state, queue: [...state.queue, line] } : { ...state, current: line }
    }
    case "audioStarted":
      return state.current ? { ...state, body: "speaking", expression: state.current.expression } : state
    case "audioEnded":
    case "audioFailed":
      return state.current ? next(state) : state
    case "turnEnded": {
      const { dropTurn: _dropped, ...rest } = state
      return rest.body === "thinking" && !rest.current ? initialCallState : rest
    }
    case "interrupt":
      return { body: "idle", expression: "neutral", queue: [], ...(event.streaming ? { dropTurn: true as const } : {}) }
    case "end":
      return { body: "ended", expression: "neutral", queue: [] }
  }
}

export const MAX_SENTENCE = 500

export function validateSentence(input: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = input.trim()
  if (!text) return { ok: false, error: "Type something for her to say." }
  if (text.length > MAX_SENTENCE) return { ok: false, error: "Keep it under 500 characters." }
  return { ok: true, text }
}
