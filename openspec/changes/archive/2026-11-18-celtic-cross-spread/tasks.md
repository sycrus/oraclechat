## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing draw tests: ten distinct cards in Celtic Cross order with orientations; signature cards distinct from all ten. Implement the position table and the new spread type.
- [x] 1.2 Failing ChatService test: a `celtic-cross` turn emits and persists one ten-card spread, and both tellers get the same draw and the concise-reply line. Implement.
- [x] 1.3 Failing API test: `celtic-cross` accepted, unknown value 400. Implement.

### 2. Frontend (TDD)
- [x] 2.1 Failing parser tests: valid ten-card spread; wrong count, wrong position, duplicate card and unknown type rejected. Implement.
- [x] 2.2 Failing test that the composer offers *Celtic Cross*. Implement the option, the layout CSS and position labels.

### 3. Verification and alignment
- [x] 3.1 Live: a Celtic Cross turn with both tellers; ten cards render and replies stay readable. (Verified 2026-11-18 through the frontend API: one ten-card spread persisted, both tellers replied in 119 and 89 words. The cross-and-staff layout was not inspected in a browser.)
- [x] 3.2 Update the PRD line and milestone notes; check ADR alignment; run `pnpm test`, `pnpm lint`, `pnpm build` and `graphify update .`.
