## Tasks

### 1. Definitions and persona (TDD)
- [x] 1.1 Failing tests: schema requires `signatureCard`; Mira is `action`, Sage is `shadow`.
- [x] 1.2 Add `signatureCard` to the schema and both YAML definitions.
- [x] 1.3 Failing tests for `buildTellerInstructions` (persona, life context, lens, relationship); implement it.

### 2. Signature draw and chat flow (TDD)
- [x] 2.1 Failing tests for `drawSignatureCards` (distinct, excludes spread, orientation meaning); implement it.
- [x] 2.2 Failing store test for round-tripping `signatureCard`; add the column and mapping.
- [x] 2.3 Failing ChatService test: per-teller card in input, on `message_start`, persisted; persona instructions used. Implement.

### 3. UI (TDD)
- [x] 3.1 Failing tests for `parseSignatureCard`; implement it.
- [x] 3.2 Render the labeled signature card in teller replies, both live and reloaded.

### 4. Verification and alignment
- [x] 4.1 Run a live two-teller turn and confirm both cards and distinct replies. (Verified 2026-11-18 in Chrome: labeled Action/Shadow cards render under each byline, persist on reload, and fit at 390px.)
- [x] 4.3 Regression: a failed turn streams `{type: "error", error}` so the UI shows the reason instead of "Response failed" (found during 4.1).
- [x] 4.2 Check ADR alignment; run `pnpm test`, `pnpm lint`, and `graphify update .`.
