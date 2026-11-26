# ADR-0021: Opt-in OpenAI guardrails, enabled only by a separate launch command

**Status:** Accepted
**Date:** 2026-11-25
**Supersedes:** None (fills the orchestration spec's deferred "Response guardrail evaluation"; amends ADR-0008 for care turns only)

## Context

Tellers are told to stay constructive and non-fatalistic, but nothing checks what they actually say, and nothing notices when a user's message signals self-harm. Local `qwen3.5:9b` replies and hosted replies (ADR-0014) can both drift into doom, false certainty about health, money or the law, or predictions about other people's fate. The owner wants OpenAI's moderation and a small classifier model to check messages and replies. ADR-0002 says nothing leaves the PC unless the owner explicitly enables it, and a guardrail call sends the user's text to OpenAI even when replies are local.

## Decision

- **A separate launch command turns guardrails on.** `pnpm --filter @oracle/agent start:guarded` starts the backend with `--guardrails=openai`. The plain `start` command never runs guardrails, even if guardrail variables are set in `.env`. Being local-only means nothing is sent out.
- **Own configuration.** Guarded mode needs `OPENAI_GUARDRAILS_API_KEY` and `OPENAI_GUARDRAILS_MODEL`, and refuses to start if either is missing. It always calls OpenAI (`api.openai.com`), separately from the `HOSTED_*` provider. Guardrails and hosted replies are independent: either, both or neither can be on.
- **Input check.** The text of each user message is checked by the OpenAI Moderation API before routing. A self-harm signal turns the turn into a **care turn**. Sexual content involving minors ends the turn with an app-written refusal. Other categories are recorded and the turn continues.
- **Care turn.** No reading, lookup, interactive reading or birth-details form. One teller replies (the least recently spoken), with a care note telling them to step out of the reading and answer sincerely. The app then shows app-written support text that may mention helplines and emergency services but never acts for the user (it contacts no one and opens nothing). Memory extraction is skipped for care turns, so distress is never saved as a memory. This amends ADR-0008's "both tellers always respond" for care turns only.
- **Output check, per sentence, before anything is shown or spoken.** Each teller reply sentence goes through moderation and a fortune-telling ethics classifier (fatalism; certainty about health, money or the law; predictions of another person's fate; encouraging dependence). A sentence is released to chat or speech only after it passes. On a failure, the model stream stops, the failing sentence and everything after it are dropped, and the reply ends at the last passing sentence. If none passed, an app-written line stands in.
- **What is sent.** The user's message text, and each reply sentence with the reply text before it. Never memories, history, birth details, readings, link pages or search results.
- **Fail closed.** If a check errors or times out, the turn ends with an error. Text is never released unchecked, and nothing falls back to an unguarded path.
- **Visible and traced.** The UI's model status shows when guardrails are on. Spans record each check's outcome and category, never content or the key (ADR-0004).

## Consequences

- With guardrails on, user messages and reply text leave the PC for OpenAI even when replies are local. Reply sentences can paraphrase memories the teller used. The owner accepts this by launching in guarded mode.
- The first sentence of every reply is delayed by about one check round-trip, which is most noticeable in calls.
- An OpenAI outage stops guarded turns until it recovers or the owner restarts with `start`.
- Generic moderation flags tarot imagery (Death, The Tower, Ten of Swords). Thresholds are tuned per category against a fixture of ordinary readings that must pass.
- Local-only mode still has no automated guardrails. A local guard model is a possible later decision.

## Validation

Tests verify that:

- `start` with guardrail variables set makes no guardrail request; `--guardrails=openai` without the key or model refuses to start;
- a self-harm-flagged message gives a care turn: one teller, no reading or lookup, support text shown, no memory extraction;
- a failing sentence is never emitted as a chunk or spoken sentence, the saved reply ends at the last passing sentence, and the stream is stopped;
- a check error ends the turn with an error event and no unchecked text;
- guardrail requests contain only the user text or reply text, never memories, history or reading data;
- the ordinary-readings fixture passes the output checks;
- spans carry outcomes and categories, never content or the key.

A live check in guarded mode confirms one passing reply, one care turn and one truncated reply in chat and in a call.
