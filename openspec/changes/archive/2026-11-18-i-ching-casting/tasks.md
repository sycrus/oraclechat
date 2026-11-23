## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing cast and catalog tests; implement `iching/cast.ts` and `iching/hexagrams.ts` with the 64 original entries and provenance.
- [x] 1.2 Failing ChatService test: an `i-ching` turn persists and emits one casting, both tellers get the same casting, no signature cards. Implement.
- [x] 1.3 Failing API test: `i-ching` accepted. Implement.

### 2. Frontend (TDD)
- [x] 2.1 Failing parser tests for `lib/iching.ts`. Implement.
- [x] 2.2 Failing composer-option test; implement the option, `IChingView` and its CSS.

### 3. Verification and alignment
- [x] 3.1 Live: an I Ching casting with both tellers; the hexagram renders and replies stay readable. (Verified 2026-11-18 through the frontend API: one casting persisted, both tellers replied in 112 and 106 words, no signature cards. The rendered hexagram was not inspected in a browser.)
- [x] 3.2 Update the PRD and milestone notes; check ADR alignment; run `pnpm test`, `pnpm lint`, `pnpm build` and `graphify update .`.
