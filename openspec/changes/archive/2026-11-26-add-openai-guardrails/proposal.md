# Proposal

Add opt-in OpenAI guardrails that check user messages and every teller reply sentence before it is shown or spoken, turned on only by a separate launch command, so local-only OracleChat still sends nothing out.

## Why

The orchestration spec defers "Response guardrail evaluation": tellers are told to be constructive, but nothing checks what they say. Nothing notices a user in distress mid-reading either. The upcoming model comparison (local vs hosted) also needs guardrail outcomes as a metric. The owner wants OpenAI's moderation and a small classifier for this, without weakening the local-first default (ADR-0002).

## What Changes

- **Separate launch command.** `pnpm --filter @oracle/agent start:guarded` passes `--guardrails=openai`. Only that flag enables guardrails. It needs `OPENAI_GUARDRAILS_API_KEY` and `OPENAI_GUARDRAILS_MODEL`, and refuses to start without them. Plain `start` never calls the guardrail service, even with those variables set.
- **Input check.** Each user message is checked by OpenAI moderation before routing:
  - self-harm starts a **care turn**;
  - sexual content involving minors gets an app-written refusal;
  - anything else is traced and the turn continues.
- **Care turn.** No reading, lookup, interactive reading or form. One teller steps out of the reading and answers sincerely. The app adds support text.
- **Per-sentence output check.** Teller reply sentences are held until they pass both moderation and a fortune-telling ethics check (fatalism; certainty about health, money or the law; another person's fate; dependence). A failure stops the stream and ends the reply at the last passing sentence, or uses an app-written line if none passed. This applies in chat and in calls.
- **Fail closed.** If a check errors, the turn ends with an error. No unchecked text is shown.
- **Minimal data sent.** Only user message text and reply sentences, never memories, history, birth details, readings, links or search results.
- **Visible and traced.** The model status shows "OpenAI guardrails". Spans record outcomes and categories, never content.
- **New ADR-0021** records these decisions and amends ADR-0008 for care turns.

## Capabilities

### New Capabilities
- `guardrails`: guarded launch mode, input moderation, care turns, per-sentence output checks, failure handling, data minimisation, status and traces.

### Modified Capabilities
- `orchestration`: response ordering gains the care-turn exception, and the deferred guardrail section is removed.

## Non-goals

- Guardrails in local-only mode, or a local guard model (a later decision).
- Checking router or memory-extractor output, which users never see.
- Checking app-written text: invitations, catalog meanings, support text.
- Jailbreak, prompt-injection or personal-data detectors.
- Regenerating a failed reply, and user-facing guardrail settings.
- The eval arena and dashboard (the next change).

## Impact

- Backend: new `backend/agent/src/guardrails/`; `chat/service.ts` (input gate, care turn, sentence gating); `agent/runtime.ts` (abortable streams); `server.ts` (flag and config); `server/app.ts` (status); `package.json` (`start:guarded`).
- Frontend: model status label in `message-body.tsx` and `chat-workspace.tsx`.
- Docs: `docs/operations.md` (guarded launch, variables).
- No new dependencies: moderation uses `fetch`, and the classifier reuses the Agents SDK runtime.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0008, ADR-0009, ADR-0012, ADR-0014, ADR-0015, ADR-0018, ADR-0021
