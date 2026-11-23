## Context

- **Store.** `PostgresMemoryStore` keeps `user_memories(id, user_id, content, source_conversation_id, created_at, updated_at)`. The source conversation is linked with `ON DELETE CASCADE`.
- **Writes.** `MemoryService.remember` appends a memory, skipping exact duplicates.
- **Distiller.** `extractUserFacts(userMessages)` is a `runLocalAgent` call that returns at most 8 strings. It sees only the user's messages, with no teller attribution and no existing memories.
- **Reads.** `ChatService` calls `memory.list()` and sends every memory to the ranker (`consentedContext`) and to each teller (`Consented user context:`).
- **Embedding model.** Ollama has `nomic-embed-text` installed, and its OpenAI-compatible `/v1/embeddings` endpoint serves it.
- **Tests.** Store tests run on pg-mem, which has no pgvector.

## Decision

### Data
Add three columns with `ADD COLUMN IF NOT EXISTS`, following the existing pattern:
- `kind TEXT NOT NULL DEFAULT 'detail'`, either `core` or `detail`;
- `entities JSONB NOT NULL DEFAULT '[]'`, holding lower-cased strings;
- `embedding JSONB`, a number array or null.

`UserMemory` gains `kind` and `entities`. The embedding is never returned by the user-facing API. Revocation (`clear`) and conversation deletion remove the whole row, embedding included.

### Embedder
`memory/embedder.ts` defines `type Embed = (texts: string[]) => Promise<number[][]>`. The default implementation POSTs to `${OLLAMA_BASE_URL}/embeddings` with `OLLAMA_EMBED_MODEL` (default `nomic-embed-text`), and nothing else (ADR-0002). `MemoryService` takes `embed` as an option. When embedding fails, the memory is saved with a null embedding and the failure is not surfaced.

### Consolidation
`extractMemoryOperations({ userMessages, tellerIds, existing })` replaces `extractUserFacts`.
- **Input:** the conversation's user messages, the IDs and names of the tellers present, and the existing memories (`id`, `content`, `kind`, `entities`).
- **Output:** a validated JSON array of at most 8 operations:
  - `{ op: "add", content, kind, entities }`
  - `{ op: "update", id, content, kind, entities }`
- **Validation:**
  - `update` IDs must exist;
  - entity tags are lower-cased and trimmed, with at most 6 per memory;
  - a teller ID may be tagged only if that teller was in the conversation.
- **Instructions:**
  - extract only facts the user explicitly stated;
  - mark facts about the user's own interaction with a teller (for example "plans to try the step Mira suggested") with that teller's ID;
  - never invent;
  - never record teller statements as user facts;
  - prefer `update` when a fact replaces an older one.

`MemoryService.apply(operations, conversationId)` performs the operations and embeds the changed contents in one batch call.

### Recall
`MemoryService.recall({ message, tellerId? }): Promise<UserMemory[]>` is a pure selection over `list()` plus a single embedding of the message. It combines:
1. every `core` memory (at most 3, oldest first);
2. entity matches, where a memory entity appears as a whole word in the lower-cased message, or equals `tellerId`;
3. semantic matches by cosine similarity of the message and memory embeddings (see tuning below), best first;
4. a de-duplicated union in that order, capped at 8.

If the message can't be embedded, recall skips step 3.

`ChatService` calls `recall({ message })` once for the ranker, and `recall({ message, tellerId })` for each teller. Both replace `list()`.

### API and UI
- `PATCH /api/memory/:id` accepts an optional `kind` alongside `content`, and edits re-embed.
- The memory panel shows a pin toggle (`core` ⇄ `detail`) and the entity tags as chips.

### Tracing (ADR-0004)
An `oracle.memory.recall` span records counts only: `core`, `entity`, `semantic`, `selected` and `total`. No memory text or entity names are recorded.

### Rejected
- **GraphRAG or a graph database.** See ADR-0009.
- **Ranking in pgvector SQL.** pg-mem can't run it, and at a few hundred rows ranking in application code is instant. Revisit if memories reach thousands.
- **Separate memory stores per teller.** That would split one consented user-owned record. Tags give per-teller recall without the split.
- **Model-initiated deletion.** The user owns deletions.

### Tuning from live checks (2026-11-18)
- **Recall threshold.** On `nomic-embed-text`, relevant matches scored 0.47–0.59 and noise up to 0.48, so a fixed 0.55 floor missed real matches. Semantic recall now needs a score ≥ 0.45 **and** at least 0.09 above the query's average similarity across all memories (the floor alone for ≤ 3 memories), with at most 3 semantic matches. `search_query:` and `search_document:` prefixes were tried and narrowed the gap, so they are not used.
- **Consolidation.** An explicit compare-then-update instruction with an example took updates from 1/2 to 6/6 in live samples (moved city, changed job).
- **Validation.** Teller display names map to teller IDs ("mira" → `mira-the-mystic`). Single-word junk content is dropped. Both the distiller and the ranker parse the first bracket-balanced JSON array through a shared `agent/json.ts`.
- **Input.** The distiller sees the last 3 user messages plus existing memories, rather than the whole conversation; existing memories carry the earlier context.
- **Ordering.** Memories gain a `sequence BIGSERIAL` column so "oldest first" is stable when several are saved at once.

## Verification

Test-first:
- **Store:** round-trips `kind`, `entities` and `embedding`; the API view omits `embedding`; `clear` and conversation deletion remove the rows.
- **Operations validator:** rejects unknown update IDs, untagged teller IDs and over-long lists, and normalises entities.
- **apply:** an update replaces the old content and re-embeds; an add embeds; when the embedder fails, the memory is still saved.
- **recall:** core is always present; an entity named in the message is matched; a memory tagged with the teller is matched only for that teller; the similarity floor and the cap of 8 hold; when the embedder is down, core and entity matches are still returned.
- **ChatService:** the ranker and each teller receive their own recalled set, and Mira's interaction memory reaches Mira but not Sage.
- **Embedder:** calls only the configured Ollama URL.
- **UI:** the pin toggle sends `kind`.

Then run a live consented conversation: state facts and update one ("moved to Osaka"), mention a person by name, tell Mira something, and check what each teller receives (via test logs, not traces).

## ADR alignment

- ADR-0009 (Accepted 2026-11-18): implements consolidation, local embeddings, core, entity and semantic recall, and ranking in application code.
- ADR-0002: the embedder and distiller use only the local Ollama endpoint.
- ADR-0003: retrieval and memory selection are application-owned. Tellers receive context and do not call memory tools.
- ADR-0004: recall spans carry counts only.
- ADR-0001 and ADR-0007: single-user, consent-gated memory, with revocation and deletion unchanged.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0009
