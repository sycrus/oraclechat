## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing teller schema tests (`readingLens`, signature card only for tarot); update the schema and Mira; draft Sage as the I Ching teller for owner review.
- [x] 1.2 Failing turn-router tests (scores plus reading, spread and query; validation; no memories); turn `orchestration/ranker.ts` into `orchestration/router.ts`.
- [x] 1.3 Failing link extraction and safe-fetch tests; implement `search/links.ts`.
- [x] 1.4 Failing ChatService tests (reading rules, discipline draws, per-teller persistence and reference, per-teller lookups, shared links, failures, no recall before routing); implement, including the `links` column, and remove the `spreadType` and `webSearch` arguments.
- [x] 1.5 Failing API test (`spread` or `search` rejected); implement and wire `server.ts`.

### 2. Frontend (TDD)
- [x] 2.1 Failing parser tests for teller readings, `{ query, results }`, links and old shapes; update `lib/search.ts` and the reading parsers.
- [x] 2.2 Failing tests for a controls-free composer, teller-attached readings and sources, and the link list; implement.

### 3. Verification and alignment
- [x] 3.1 Live checks: "Mira, read for me" gets tarot from Mira only; "can you both read for me" gets tarot from Mira and the I Ching from Sage; a one-to-one "pull a Celtic Cross" uses that spread; a current-events question triggers a search; a pasted article gets comments; a `localhost` link is refused.
- [x] 3.2 Owner approves Sage's I Ching persona (approved as a first version; fine-tune later).
- [x] 3.3 Update the PRD, `docs/operations.md`, `.env.example` and the chat spec deferred line. Owner accepts ADR-0012; mark ADR-0011 Superseded and update the index. Check ADR alignment; run `pnpm test`, `pnpm lint`, `pnpm build` and `graphify update .`.
