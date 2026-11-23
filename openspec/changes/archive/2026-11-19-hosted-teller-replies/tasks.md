## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing tests for `loadHostedModelConfig` (none, all, partial); implement `agent/hosted.ts`.
- [x] 1.2 Failing runtime tests (hosted key and base URL, no reasoning setting, `hosted` span label, key absent from spans); implement `apiKey` and `system` in the model config.
- [x] 1.3 Failing memory tests (hosted consent defaults off, needs memory consent, cleared on revocation); implement the column, store and service methods.
- [x] 1.4 Failing ChatService tests (memory gate for hosted replies, `oracle.teller.hosted`, failure with no retry); implement `hostedReplies`.
- [x] 1.5 Failing API tests (extended `GET /api/memory`, `PUT /api/memory/hosted-consent`); implement, and wire `server.ts`.

### 2. Frontend (TDD)
- [x] 2.1 Failing test for `modelStatusLabel`; implement it, the top-bar label, the hosted-sharing toggle and the proxy route.

### 3. Verification and alignment
- [x] 3.1 Live check: unset variables keep Oracle local and its chat working (verified; a partial configuration refused startup). Not done: a live hosted reply with a real key; the owner chose to skip it for now, so the hosted path is verified against fake endpoints only.
- [x] 3.2 Update `.env.example`, `docs/operations.md` and the PRD. Owner accepts ADR-0014. Check ADR alignment; run `pnpm test`, `pnpm lint`, `pnpm build` and `graphify update .`.
