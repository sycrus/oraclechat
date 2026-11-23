## 1. Conversation persistence (TDD)

- [x] 1.1 Add failing tests for create/list/detail/append/delete through the `ChatStore` contract.
- [x] 1.2 Add PostgreSQL schema and implementation; make the focused storage tests pass with a Postgres-compatible in-memory adapter.
- [x] 1.3 Add startup migration and local `DATABASE_URL` configuration.

## 2. Teller profiles and routing (TDD)

- [x] 2.1 Add a failing test for loading the two tarot teller definitions.
- [x] 2.2 Add Sage and align Mira's active relationship/profile with the MVP.
- [x] 2.3 Add failing tests for 1:1 selection, one ranking result for groups, threshold inclusion, score validation, and last-spoken tie breaking.
- [x] 2.4 Implement the local-model ranker and deterministic participant selection.

## 3. HTTP chat and streaming (TDD)

- [x] 3.1 Add failing endpoint tests for creating/listing/opening conversations and sending a streamed message.
- [x] 3.2 Implement conversation routes and SSE events with attribution and persistence.
- [x] 3.3 Add a group scenario proving the second teller receives the first teller's completed response.

## 4. Desktop-first UI and verification

- [x] 4.1 Add same-origin Next route handlers and the conversation sidebar/chat pane.
- [x] 4.2 Verify frontend and backend builds, tests, lint, and ADR alignment.
- [x] 4.3 Run local Postgres/Ollama end-to-end smoke checks when services are available; record environment limitations otherwise. (Verified 2026-11-18: 1:1 Sage and two-teller Mira/Sage turns against WSL PostgreSQL + Ollama qwen3.5:9b.)
