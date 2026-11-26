# Tasks

## 1. Setup

- [x] 1.1 Get the owner's acceptance of ADR-0021 (Proposed → Accepted, index updated); verify `pnpm adr:check` passes.
- [x] 1.2 Decide the open questions in design.md (memory extraction on care turns; support text wording).

## 2. Launch mode, test-first

- [x] 2.1 Write failing `backend/agent/tests/guardrails/config.test.ts`: no `--guardrails=openai` → `undefined` even with both variables set; flag without key or model → throws naming the missing ones; flag with both → config with the fixed OpenAI base URL. Implement `guardrails/config.ts`; rerun: pass.
- [x] 2.2 Add `start:guarded` to `backend/agent/package.json`; wire `server.ts` to build guardrails only from that config; add a `ChatService` test that plain mode makes no guardrail call during a full turn; rerun: pass.

## 3. Checks, test-first

- [x] 3.1 Write failing `tests/guardrails/openai.test.ts` with stubbed `fetch`: the moderation body holds only the given text; per-category thresholds map scores to pass / care / refuse (input) and pass / block (output); timeout and non-200 → `GuardrailError`. Implement `guardrails/openai.ts` (`moderate`) and `thresholds.ts`; rerun: pass.
- [x] 3.2 Write failing tests for `checkEthics` with a stubbed runner: the input holds only the sentence and the reply so far; each verdict maps to pass/fail; invalid output → `GuardrailError`. Implement it on `runLocalAgent` with `ethics-prompt.ts`; rerun: pass.

## 4. Sentence gate and abortable stream, test-first

- [x] 4.1 Write failing `tests/guardrails/gate.test.ts` with fake checks: sentences released in order even when checks finish out of order; first failure calls `abort` and nothing after it is released; first-sentence failure → no releases, outcome `cut`; check error rejects `finish()`. Implement `guardrails/gate.ts`; rerun: pass.
- [x] 4.2 Write failing runtime tests: `AgentRequest.signal` aborts `streamLocalAgent` and the hosted stream without throwing. Implement it in `agent/runtime.ts` and `agent/hosted.ts`; rerun: pass.

## 5. Chat integration, test-first

- [x] 5.1 Write failing `tests/chat/guardrails.test.ts` for replies: a fatalistic third sentence → first two emitted and saved, third never in any `message_chunk` or `sentence` event, stream aborted; first sentence fails → stand-in saved; chat mode emits no `sentence` events; a fan reveal's interpretation is gated too. Wire `SentenceGate` into `replyAs`; rerun: pass.
- [x] 5.2 Write failing tests for input: self-harm → care turn (router not called, one teller, least recently spoken, no draw, lookup or form, care note in instructions, support message after, memory extraction not called even with consent); refusal → app message, no model call; input check error → error event before routing. Implement in `runTurn`; rerun: pass.
- [x] 5.3 Write failing data-minimisation and fail-closed tests: with memories recalled and a reading drawn, no check input contains a memory, history line or reading JSON; a sentence check timeout → error event and the pending sentence never emitted. Fix any gaps; rerun: pass.
- [x] 5.4 Write failing span tests: input and sentence spans carry outcome and category, never text or the key. Add the spans; rerun: pass.

## 6. Status, test-first

- [x] 6.1 Write failing tests: the settings route returns `guardrails`; `modelStatusLabel(false, true)` → "Local models · OpenAI guardrails" and `(true, true)` → "Hosted model · OpenAI guardrails". Implement in `server/app.ts`, `message-body.tsx` and `chat-workspace.tsx`; rerun: pass.

## 7. Docs, live checks and alignment

- [x] 7.1 Document `start:guarded`, `OPENAI_GUARDRAILS_API_KEY`, `OPENAI_GUARDRAILS_MODEL` and what is sent in `docs/operations.md`.
- [x] 7.2 Add `tests/guardrails/ordinary-readings.json` (Death, Tower, Ten of Swords, hard transits, constructive interpretations) and an opt-in live test (`GUARDRAILS_LIVE=1`); tune `thresholds.ts` until it passes against the real API. *(2026-11-26, `gpt-6-luna` with reasoning off: both live tests pass with the initial thresholds, so none changed. All 23 fixture sentences pass; the fatalistic sentence fails and the self-harm message starts a care turn. Highest fixture scores: violence 0.356 of 0.85 and violence/graphic 0.146 of 0.5, both on the Ten of Swords description; every other blocking category ≤ 0.001. About 1.3 s per sentence check.)*
- [ ] 7.3 Live check in guarded mode: one passing reply, one care turn and one truncated reply, in chat and in a call; note time to first sentence.
- [x] 7.4 ADR alignment check against design.md; sync the delta specs (new `guardrails` spec; orchestration ordering, deferred section removed); run `pnpm test` and `pnpm lint`; run `graphify update .`. *(One gap found and resolved: with `TRACE_CONTENT=1`, from the later `add-trace-content-opt-in` change, the ethics check's model span records content; the guardrails trace requirement now allows that owner opt-in. ADR-0008's index entry notes the ADR-0021 amendment.)*
