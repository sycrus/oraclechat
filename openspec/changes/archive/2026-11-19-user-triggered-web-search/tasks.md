## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing Brave provider tests; implement `search/brave.ts`.
- [x] 1.2 Failing ChatService tests (trigger, query, persistence, teller context, failure, unchanged draw turns); implement, including the `search` column.
- [x] 1.3 Failing API tests (accepted, not configured, non-boolean); implement and wire `server.ts`.

### 2. Frontend (TDD)
- [x] 2.1 Failing result-parser tests; implement `lib/search.ts`.
- [x] 2.2 Failing composer default/reset and sources-list tests; implement the checkbox, request field and Sources list.

### 3. Verification and alignment
- [x] 3.1 Live search turn with the real key; sources shown and used by the tellers.
- [x] 3.2 Document the key in `.env.example` and `docs/operations.md`; update the PRD, milestones and chat spec deferred lines; owner accepts ADR-0011; check ADR alignment; run `pnpm test`, `pnpm lint`, `pnpm build` and `graphify update .`.
