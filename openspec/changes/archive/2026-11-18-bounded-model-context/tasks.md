## Tasks

### 1. Thinking control (TDD)
- [x] 1.1 Failing runtime test: `thinking: false` sends `reasoning_effort: "none"`; when omitted, no `reasoning_effort` is sent. Implement in `createAgent`, and record `oracle.agent.thinking` on the span.
- [x] 1.2 Failing tests: ranker and distiller requests carry `reasoning_effort: "none"`. Implement.
- [x] 1.3 Failing ChatService test: `tellerThinking` is forwarded (default false). Wire `TELLER_THINKING` in `server.ts` and `.env.example`.

### 2. History budget (TDD)
- [x] 2.1 Failing `boundHistory` tests (newest kept, oversized last line kept, marker only when trimmed). Implement.
- [x] 2.2 Failing ChatService test: a 25-turn conversation keeps teller input within budget, with instructions intact. Wire `historyTokenBudget` and `HISTORY_TOKEN_BUDGET`.

### 3. Ranker robustness (TDD; found during live testing)
- [x] 3a Failing test: unknown matched categories (e.g. "emotions") are dropped, not fatal. Implement.
- [x] 3b Failing test: a failing ranker leaves both tellers responding in least-recently-spoken order. Implement.

### 3c Persona bleed (found during live testing)
- [x] 3c With thinking off, both tellers copied Mira's opening about her cat from the shared history. Failing instruction test, then add the "life details are occasional and your own" rule.

### 4. Verification and alignment
- [x] 4.1 Live: ranker output under 200 tokens and the group turn succeeds; compare one teller reply with thinking on and off and record the decision. (Verified 2026-11-18: ranker output 54–66 tokens, down from 2,600–4,137; 3/3 group turns succeeded in 8–10s, down from minutes or failure. Side by side on the same Sage prompt: thinking off took 5s and stayed in character with a fuller reading; thinking on took 13s, was tighter and engaged more with Mira. **Decision: thinking off by default**, with `TELLER_THINKING=true` available. After the persona rule, the openings differ, Mira mentions her cat at most once and Sage never does.)
- [x] 4.2 Check ADR alignment; run `pnpm test`, `pnpm lint` and `graphify update .`.
