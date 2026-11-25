# Tasks

## 1. Characterisation tests

- [x] 1.1 Add `backend/agent/tests/memory/extractor-window.test.ts`: four user messages in, only the last three reach the distiller. Run it: pass.
- [x] 1.2 Add an interrupted-reply case to `backend/agent/tests/chat/service.test.ts`: a stream that emits a chunk and then throws leaves only the user message saved. Run it: pass.

## 2. Specs and ADR index

- [x] 2.1 Memory spec: recall supplies tellers only (router gets none); extraction receives only the last three user messages and no teller replies.
- [x] 2.2 Chat spec: history rebuilt per reply and dropped, not summarised; new "Messages are saved when complete".
- [x] 2.3 ADR index: note on ADR-0009 that its ranker clause is superseded by ADR-0012.

## 3. Overview and checks

- [x] 3.1 Write `docs/architecture.md` (turn diagram, routing, history, memory, with links).
- [x] 3.2 Sync the delta specs into `openspec/specs/`; run `pnpm test` and `pnpm lint`; ADR alignment check against design.md.
