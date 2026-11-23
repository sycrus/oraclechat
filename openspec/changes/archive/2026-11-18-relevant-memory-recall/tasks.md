## Tasks

### 1. Storage and embedder (TDD)
- [x] 1.1 Failing store tests: `kind`, `entities` and `embedding` round-trip; the API view omits `embedding`; revocation and conversation deletion remove the rows. Add the columns and mapping.
- [x] 1.2 Failing embedder test: posts to the configured Ollama `/embeddings` with `OLLAMA_EMBED_MODEL` and returns vectors. Implement `memory/embedder.ts`.

### 2. Consolidation (TDD)
- [x] 2.1 Failing validator tests for distiller operations: unknown update ID, foreign teller tag, over-long list, entity normalisation.
- [x] 2.2 Implement `extractMemoryOperations` (existing memories and teller IDs in its input).
- [x] 2.3 Failing `MemoryService.apply` tests: update replaces and re-embeds, add embeds, a failing embedder still saves. Implement.

### 3. Recall (TDD)
- [x] 3.1 Failing `recall` tests: core always included (at most 3), entity named in the message, teller-tagged memory only for that teller, similarity floor, cap of 8, embedder-down fallback.
- [x] 3.2 Implement `recall` and the `oracle.memory.recall` count-only span.
- [x] 3.3 Failing ChatService test: separate recalled sets for the ranker and each teller; Mira's interaction memory reaches Mira only. Wire it in, replacing `list()`.

### 4. Controls (TDD)
- [x] 4.1 Failing API test: `PATCH /api/memory/:id` accepts `kind`, and edits re-embed.
- [x] 4.2 Memory panel: pin toggle and entity chips.

### 5. Verification and alignment
- [x] 5.1 Live consented conversation: update a fact, mention a named person, tell Mira something; confirm consolidation and per-teller recall. (Model calls verified 2026-11-18 without saving anything: the embedder returns 768-dim vectors; the distiller updated "Lives in Tokyo" → Osaka and "Works as a nurse" → teacher 6/6 and tagged the Mira promise. Owner confirmed in-app on 2026-11-18 that memory behaves correctly.)
- [x] 5.2 ADR-0009 accepted by the owner on 2026-11-18. Check ADR alignment; run `pnpm test`, `pnpm lint` and `graphify update .`.
