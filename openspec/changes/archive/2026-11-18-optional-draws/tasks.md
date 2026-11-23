## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing ChatService tests: a `none` or omitted turn has no spread, no signature cards and the no-draw note; a later `none` turn references the earlier spread and the teller's last signature card; draw turns are unchanged.
- [x] 1.2 Implement in ChatService; set `oracle.turn.spread = "none"`.
- [x] 1.3 Failing API test: `spread: "none"` is accepted and invalid values are a 400. Implement.

### 2. UI (TDD)
- [x] 2.1 Failing tests for the composer default and reset, and for the indicator wording by turn type. Implement the *No cards* option, the reset after send, and the wording.

### 3. Verification and alignment
- [x] 3.1 Live: a conversation turn (no cards, no invented draw), then a three-card turn, then "tell me more about the present card" with no cards. (Verified 2026-11-18: turn 1 had no spread, no signature cards and no card names in either reply; turn 2 drew a spread plus both signature cards; turn 3 drew nothing and both tellers expanded on the earlier present card, the Knight of Pentacles. Mira called you "the user", so the no-draw note now asks tellers to speak to you as "you".)
- [x] 3.2 Update the PRD line; check ADR alignment; run `pnpm test`, `pnpm lint` and `graphify update .`.
