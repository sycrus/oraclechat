## Context

- `runtime.ts` creates an `OpenAIProvider` with `apiKey: "ollama"` and `useResponses: false` for a `LocalModelConfig { baseURL, model }`. Spans hard-code `gen_ai.system: "ollama"`. `thinking: false` sends `reasoning_effort: "none"`.
- `server.ts` wires `ChatService.stream` to `streamLocalAgent` with the Ollama config. Routing (`routeTurn`), memory extraction and embeddings take that config separately.
- Memory consent is one row in `memory_consent (user_id, consented, updated_at)`. `MemoryService.setConsent(false)` clears memories. `ChatService` recalls memories per teller when consent is on.
- The frontend loads `/api/memory` on start; the top bar always says "Local models".

## Decision

- **Model config.** `LocalModelConfig` gains optional `apiKey` and `system` (span label, default `"ollama"`). `createRunner` uses `config.apiKey ?? "ollama"`. New `agent/hosted.ts`: `loadHostedModelConfig(env)` returns `undefined` when none of `HOSTED_BASE_URL`, `HOSTED_API_KEY` or `HOSTED_MODEL` is set, `{ baseURL, apiKey, model, system: "hosted" }` when all are, and throws naming the missing ones otherwise. Values are trimmed; error messages never include the key.
- **Wiring.** When hosted is configured, `server.ts` streams teller replies with `streamLocalAgent(request without thinking, onChunk, hosted)` and passes `hostedReplies: true` to `ChatService`. Everything else keeps the Ollama config. There is no try/catch fallback: a failed hosted call rejects, and `ChatService` already turns that into an `error` event.
- **ChatService.** New option `hostedReplies?: boolean`. Per teller, memories are recalled only if consent is on and, when `hostedReplies`, `memory.hasHostedConsent()` is also true. The reply span gets `oracle.teller.hosted`. `replySettings()` returns `{ hostedReplies }`.
- **Memory.** `memory_consent` gains `hosted_consented BOOLEAN NOT NULL DEFAULT false` (`ADD COLUMN IF NOT EXISTS`). `MemoryStore` gains `hasHostedConsent()` and `setHostedConsent(boolean)`. `MemoryService.setHostedConsent(true)` throws without memory consent; `setConsent(false)` also clears hosted consent. `hasHostedConsent()` is true only when both are on.
- **API.** `GET /api/memory` returns `{ consented, hostedConsented, hostedReplies, memories }`. `PUT /api/memory/hosted-consent { consented: boolean }` returns 400 for a non-boolean, when hosted replies are off (`hosted replies are not configured`) and when turning on without memory consent (`memory must be on first`).
- **Frontend.** A `api/memory/hosted-consent` proxy route. `modelStatusLabel(hosted)` gives "Hosted model" or "Local models" for the top bar. When `hostedReplies` and memory are both on, the memory panel shows a second toggle with a note that saved details would be sent to the hosted provider.
- **Docs.** `.env.example`, `docs/operations.md` (setup, privacy, cost, no fallback), and the PRD's out-of-scope line.

Rejected:
- **Hosting routing and memory extraction too.** More text leaves the PC for little gain.
- **Falling back to local when hosted fails.** It hides a configuration problem and mixes models without the user knowing.
- **Reusing memory consent for hosted calls.** The owner chose a separate opt-in.

## Verification

Test-first:
- `loadHostedModelConfig`: none set, all set, partial set (error names the missing variables and not the key).
- Runtime: a hosted config sends `Authorization: Bearer <key>` to its base URL with no `reasoning_effort`; the span label is `hosted`; the key is absent from spans.
- Memory: hosted consent defaults off, needs memory consent, and is cleared by revocation.
- ChatService: hosted replies get no memories without hosted consent and get them with it; local replies are unaffected; `oracle.teller.hosted` is set; a failed reply ends with an error and no second stream call.
- API: the extended `GET /api/memory`; `PUT /api/memory/hosted-consent` validation and both 400s.
- Frontend: `modelStatusLabel`.

Then a live check with a real hosted key, if the owner provides one.

## ADR alignment

- ADR-0002: hosted is explicit, off by default, and never a fallback; the local profile needs no key.
- ADR-0003: the same Agents SDK runtime and app-owned orchestration.
- ADR-0004: spans carry only a hosted flag and a label.
- ADR-0009: memory recall is unchanged locally, with an extra gate for hosted replies.
- ADR-0010: the local production profile is unchanged when the variables are unset.
- ADR-0007 and ADR-0001: single-user scope is unchanged.
- ADR-0012: routing stays local.
- ADR-0014 (Proposed, added here) records the decision.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0009, ADR-0010, ADR-0012, ADR-0014
