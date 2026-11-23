## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing `tests/chat/spoken.test.ts` (split tags across chunks, multiple sentences per chunk, ellipsis and closing quotes, newline, final sentence without punctuation, unknown tag → neutral, markdown dropped from speech, `stripTags` keeps markdown); implement `src/chat/spoken.ts`.
- [x] 1.2 Failing `ChatService` tests: call note only with `call`; `sentence` events in order with expressions; tag-free `message_chunk` and saved content; group or uncallable teller rejected before saving; reading still saved; span attributes; implement in `src/chat/service.ts`.
- [x] 1.3 Failing route tests: `call` must be boolean and is passed through; implement in `src/server/app.ts`.

### 2. Frontend (TDD)
- [x] 2.1 Failing reducer tests (`think`, sentence from thinking, expression on start and reset, `turnEnded`); update `lib/call/state.ts`.
- [x] 2.2 Failing tests for `readEvents` and for `easeToward` / `thinkingPose`; implement `lib/call/events.ts` and `lib/call/pose.ts`.
- [x] 2.3 Failing view tests ("…" while thinking, readings note, input disabled during a turn); update `call-overlay-view.tsx`, `call-overlay.tsx` (chat and `?say=1` modes) and `chat-workspace.tsx` (mode, reload after the turn).
- [x] 2.4 Stage: thinking pose and expression blending in `vrm-stage.ts`; tune angles against screenshots.

### 3. Verification and alignment
- [x] 3.1 Live call on the dev servers (throwaway conversation, deleted afterwards): replies spoken sentence by sentence with no gap (sentence audio is requested as each sentence arrives); first word 1.8–2.6 s warm; thinking pose and a `happy` expression captured in screenshots; a three-card reading showed "Mira drew 4 cards — see chat"; the saved replies contained no tags; Whisper round trip correct. GIF `mira_call_conversation_m2.gif`. Found and fixed during the check: with the call note mid-input the local model ignored the tags (0 tagged), so it now also goes in the instructions and last in the input (probe over 5 turns: 4/14 sentences non-neutral; an explicit `[neutral]` cannot be told apart from a missing tag). A cold Ollama model made one turn take 13.5 s. Rendering was throttled to 2–10 fps because the Chrome window was not in front; not a code issue.
- [x] 3.2 Update `docs/operations.md` (call conversation, `?say=1`). Check ADR alignment; run `pnpm test`, `pnpm lint` (includes `pnpm adr:check`), the sidecar pytest and `graphify update .`.
