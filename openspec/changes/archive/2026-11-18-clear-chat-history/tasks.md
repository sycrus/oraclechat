## Tasks

- [x] 1.1 Failing tests: the store deletes all conversations; the service keeps memories (source null) on a clear-all; a single delete still cascades. Implement, including the nullable column migration.
- [x] 1.2 Failing API test: `DELETE /api/conversations` returns 204 and the list is empty. Implement the route and the frontend proxy `DELETE`.
- [x] 2.1 Failing UI helper test; add the sidebar button with confirmation.
- [x] 3.1 Live: the nullable-source migration ran on the real database (`is_nullable = YES`); the clear itself is left to the owner, since it deletes their conversations. Memory survival is covered by service and store tests.
- [x] 3.2 ADR alignment; `pnpm test`, `pnpm lint`, `graphify update .`.
