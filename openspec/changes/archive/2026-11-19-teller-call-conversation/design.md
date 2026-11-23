## Context

M1 (archived `2026-11-19-teller-video-call`, ADR-0015) gives the overlay a VRM stage, a call state machine (`frontend/app/src/lib/call/state.ts`) with a sentence queue, loudness lip sync, and `/api/tts` through the backend to the local OmniVoice sidecar. Chat turns run through `ChatService.sendMessage` (`backend/agent/src/chat/service.ts`): route → per-teller reply streamed with `message_start` / `message_chunk` / `message_complete` server-sent events from `POST /api/conversations/:id/messages` (`src/server/app.ts`), then memory extraction. Teller replies are already short (`tellers/instructions.ts` reply style; `NO_DRAW_NOTE`).

## Decision

### Backend — reused and new

- **Reused unchanged:** routing, readings, lookups, memory recall and extraction, hosted replies, history, the reply length rules.
- **`POST /api/conversations/:id/messages`** accepts an optional `call: boolean`. Non-boolean → 400. `call: true` is rejected with 400 unless the conversation has exactly one teller and that teller has `call` configured (checked in `ChatService`, before the user message is saved).
- **`sendMessage(id, content, emit, { call })`**: when `call` is true:
  - `CALL_NOTE` is appended to each teller's turn context: speak as if on a video call, plain spoken sentences only (no markdown, lists, links or emoji), and start every sentence with one of `[happy] [relaxed] [surprised] [sad] [neutral]`.
  - The stream callback goes through a **`SpokenSplitter`** (new pure module `src/chat/spoken.ts`). `push(chunk)` buffers text and returns complete sentences; `end()` returns the remainder. A sentence ends at `.`, `!`, `?` or `…` (with any closing quotes or brackets) followed by whitespace, or at a newline. Each sentence becomes `{ text, expression }`: a leading `[word]` sets the expression (unknown words → `neutral`) and is removed; known tags elsewhere are removed; `*`, `_`, `#` and backticks are dropped from the spoken text; empty sentences are skipped.
  - For each sentence the service emits `message_chunk` with the clean sentence text (plus a space) and a new `sentence` event `{ tellerId, messageId, text, expression }`. Raw model chunks are not forwarded in call mode, so the chat never sees a tag.
  - The saved content is `stripTags(output)`: the same tag removal applied to the whole reply, keeping its markdown and line breaks.
- **Tracing:** the reply span gains `oracle.teller.call` (boolean) and `oracle.call.sentences` (count). No text.

### Frontend — reused and new

- **Reused:** `vrm-stage.ts`, `mouth.ts`, `idle.ts`, the `/api/tts` proxy, the voice-offline subtitle path, `callableTeller`.
- **`lib/call/events.ts`** (new): `readEvents(body, onEvent)` parses the server-sent event stream (`data: {...}` blocks) and throws on an `error` event. The chat page's own parser is left as it is.
- **`lib/call/state.ts`**: queue items become `{ text, expression }`. New body state `thinking` and events:
  - `think`: idle with nothing current → thinking.
  - `say(text, expression = "neutral")`: as before; it does not leave thinking.
  - `audioStarted`: → speaking, `expression` = current item's expression.
  - `audioEnded` / `audioFailed`: next item, or idle with `neutral`.
  - `turnEnded`: if thinking with nothing current or queued → idle (a turn that produced no sentences or failed).
  - The playback effect plays when the body is not `speaking` and an item is current, so the first sentence plays straight from thinking.
- **`call-overlay.tsx`**: a `mode` prop, `"chat"` (default) or `"say"` (when the page URL has `say=1`). In chat mode, submit dispatches `think`, posts `{ content, call: true }`, and for each event: `sentence` → `say`; `message_start` with a reading → the note "Mira drew N cards — see chat" (N = spread cards plus the signature card); stream end → `turnEnded` and `onTurnComplete()`; error → `turnEnded` and an error message. The input is disabled while a turn is in flight. The subtitle shows "…" while thinking.
- **`chat-workspace.tsx`**: passes `mode` and `onTurnComplete={() => openConversation(active.id)}` so the transcript shows the saved turn.
- **`vrm-stage.ts`**: `setState({ thinking, expression })`. A thinking weight eases toward 0 or 1 (~300 ms) and blends:
  - right upper arm from the lowered pose up toward the chest, the right lower arm bent about 120°, and the hand tilted so it rests near the chin (angles tuned against screenshots);
  - head turned about 20° to the side and tilted slightly up, with the eyes using the `lookUp` and `lookLeft` expressions at about 0.5.
  The expression weight eases toward 0.7 for the active expression and 0 for the others.
- **`lib/call/pose.ts`** (new, pure): `easeToward(current, target, dt)` and `thinkingPose(weight)` returning the bone angles, so the blend can be tested without WebGL.

### Test-first order

1. `spoken.test.ts`: chunk boundaries split mid-tag (`"[hap"`, `"py] Yes."`), several sentences in one chunk, ellipsis, closing quotes, newline, no final punctuation, unknown tag → neutral, markdown dropped, `stripTags` keeps markdown.
2. `service.test.ts`: call turn emits sentences in order with expressions; `message_chunk` text has no tags; the saved message has no tags; the turn context contains the call note only with `call`; a group conversation or uncallable teller rejects before saving; a reading in a call turn still saves.
3. `app.test.ts`: `call` must be a boolean; the route passes it through.
4. Frontend: reducer (`think`, first sentence from thinking, expression set on start and reset on idle, `turnEnded` with and without queued items); `readEvents` (split blocks, error event); `thinkingPose` and `easeToward`; overlay view shows "…" while thinking and the readings note.
5. Live: a Whisper round trip on spoken sentences, screenshots of the thinking pose and an expression, the transcript after the call.

## Verification

`pnpm test`, `pnpm lint`, the sidecar pytest; a live call on the dev servers (3001/4001) with a GIF; Whisper confirms the spoken sentences match the saved reply.

## Risks

- **Small local model ignores tags:** expressions stay neutral, nothing breaks. Measured live and reported.
- **Thinking pose angles:** guessed first, then tuned visually; the sample model's proportions may differ from the final Mira.
- **Time to first sound:** routing + first sentence + synthesis. Measured and reported, not optimized in this change.

## ADR alignment

ADRs reviewed: ADR-0002, ADR-0004, ADR-0008, ADR-0009, ADR-0012, ADR-0014, ADR-0015

- **ADR-0015:** speech stays on the local sidecar through `/api/tts`; the state machine stays app-owned, and the renderer only executes it. No new decision is needed.
- **ADR-0014 / ADR-0002:** call replies use whichever reply provider is configured; the call note is turn context, which hosted replies already receive. Voice never goes hosted.
- **ADR-0012 / ADR-0008:** routing still decides readings and lookups; calls are one-to-one, so group ordering is unaffected.
- **ADR-0009:** memory recall and extraction run unchanged for call messages.
- **ADR-0004:** new span attributes are counts and booleans only.
