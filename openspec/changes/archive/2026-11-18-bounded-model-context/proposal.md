## Intent

Make group chats reliable and faster by turning off hidden thinking where it isn't needed, and by keeping every teller prompt within a fixed history budget so long conversations never push the persona out of context (#12).

## Why now

qwen3.5 thinks by default. Traces show the ranker writing 2,600–4,100 output tokens to produce a ~60-token JSON list, and on 2026-11-18 a group turn failed because the ranker's answer came back cut off after 4,137 tokens ("incomplete JSON score array"). Tellers spend 2–3k hidden tokens per reply. Separately, every teller turn resends the whole conversation, so input grows without limit.

## What changes

- `AgentRequest` gains `thinking?: boolean`. `false` sends `reasoning_effort: "none"` through the Agents SDK's `modelSettings.reasoning.effort`; Ollama's OpenAI-compatible endpoint honours this, while `think: false` is ignored there.
- The ranker and memory distiller always run with thinking off.
- Tellers run with thinking off by default; `TELLER_THINKING=true` turns it back on.
- Teller conversation history is bounded to the newest messages within `HISTORY_TOKEN_BUDGET` (default 8,000 estimated tokens). The newest user message is always kept, and an "earlier conversation omitted" marker shows when anything was cut. Persona instructions, memories and the draw sit outside the history and are never cut.

- **Ranker robustness** (found during live testing): with thinking off, the ranker sometimes echoes profile values such as `"emotions"` as matched categories. These are now dropped instead of failing validation. Any ranking failure now falls back to least-recently-spoken order instead of failing the turn, since ranking only orders replies (ADR-0008).

## Non-goals

- Changing the model, Ollama's context length, or the inference host (#1).
- Summarising omitted history.
- Memory selection (`relevant-memory-recall`).

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
