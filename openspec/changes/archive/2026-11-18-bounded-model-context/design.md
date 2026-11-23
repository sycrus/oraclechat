## Context

- `runtime.ts` creates `new Agent({ name, instructions, model })` with no model settings, so qwen3.5's default thinking is on for every call.
- A live probe against Ollama 0.40.16's `/v1/chat/completions` with a ranker-like prompt:
  - default: 696 output tokens, 8.1s;
  - `reasoning_effort: "none"`: 13 tokens, 0.2s;
  - `reasoning: { effort: "none" }`: 11 tokens;
  - `think: false`: ignored (2,355 tokens).
- The Agents SDK maps `modelSettings.reasoning.effort` to `reasoning_effort`, and its type accepts `"none"`.
- `ChatService` builds teller history from every message in the conversation.
- Ollama serves the model with a 32,768-token context.

## Decision

- **Thinking flag.** `AgentRequest.thinking?: boolean`. When it is `false`, `createAgent` sets `modelSettings: { reasoning: { effort: "none" } }`. When it is `undefined`, the model's default is kept. Generation spans record `oracle.agent.thinking` (a boolean only).
- **Ranker and distiller.** Both always pass `thinking: false`. They produce structured JSON, and reasoning only risks truncation.
- **Tellers.** `ChatServiceOptions.tellerThinking` defaults to `false`, and `server.ts` reads `TELLER_THINKING === "true"`. A side-by-side live comparison is recorded in the tasks.
- **History budget.** A pure `boundHistory(lines, budgetTokens)` keeps the newest lines whose estimated tokens (`ceil(chars / 4)`) fit the budget, and always keeps the final line. If anything was dropped, it prepends `(Earlier conversation omitted.)`.
  - `ChatServiceOptions.historyTokenBudget` defaults to 8,000, and `server.ts` reads `HISTORY_TOKEN_BUDGET`.
  - Memories and the draw stay outside the budget.
  - Instructions go in the system field and are never part of the history.
- **Budget arithmetic** (32k window): instructions ~0.8k + memories ≤0.5k + draw ~0.5k + history ≤8k + visible reply ~1k ≈ 11k, with room left for thinking if it is turned back on.

- **Ranker robustness.** `validateRankerResponse` accepts any strings in `matchedCategories` and keeps only the three category names. `ChatService` catches a rank failure and substitutes equal zero scores, so `selectGroupResponders` falls back to least-recently-spoken order. The rank span still records the error.

Rejected:
- Raising Ollama's context to absorb growth. That costs VRAM and latency, and it only postpones the problem.
- Summarising old turns. It needs an extra model call per turn; revisit if users miss long-range context.
- Removing `/think` tags from prompts. Not supported through this endpoint.

## Verification

Test-first:
- A runtime test with a fake endpoint: `thinking: false` sends `reasoning_effort: "none"`; omitting it sends no `reasoning_effort`.
- Ranker and distiller requests carry `reasoning_effort: "none"`.
- `boundHistory`: keeps the newest lines within budget; always keeps the last line even when it is oversized; adds the marker only when something was dropped.
- ChatService: with a 25-turn conversation, the teller input stays within the budget, keeps the newest user message, drops the oldest and carries unchanged instructions; `tellerThinking` is forwarded.

Then live:
- confirm ranker output tokens are under 200 and a group turn succeeds;
- compare one teller reply with thinking on and off.

## ADR alignment

- ADR-0002: the setting goes through the local OpenAI-compatible endpoint behind the provider boundary, with no hosted fallback.
- ADR-0003: history bounding and ordering stay application-owned.
- ADR-0004: spans gain only a boolean thinking flag.
- ADR-0007 and ADR-0008: single-user; both tellers still respond, now reliably.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
