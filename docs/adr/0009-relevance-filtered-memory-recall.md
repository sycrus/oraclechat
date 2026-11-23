# ADR-0009: Relevance-filtered memory recall with local embeddings

**Status:** Accepted
**Date:** 2026-11-18
**Supersedes:** None

## Context

With consent, Oracle saves short facts the user states, and today sends **every** saved memory to the ranker and to every teller on every turn. As memories accumulate this wastes context (see #12), mixes unrelated details into readings, and makes stale facts ("lives in Tokyo" after "moved to Osaka") persist alongside new ones. Users also build an ongoing relationship with each teller, so what they told Mira should be recalled when Mira replies.

GraphRAG was considered. It targets large document corpora and needs model-driven entity and community extraction over all the text. For one user's few hundred short facts on a local 9B model, it costs a lot of slow inference for little gain.

## Decision

- **Consolidate at write time.** The memory distiller sees the existing memories and returns operations, `add` or `update` (by ID), instead of only appending. It never deletes; only the user deletes.
- **Embed locally.** Each memory is embedded with a local Ollama embedding model (default `nomic-embed-text`, configurable) when it is added or changed. The vector is stored with the memory and deleted with it. No hosted embedding service is used (ADR-0002).
- **Recall per turn, per teller.** The memories sent to a teller are the union of:
  - **core** memories, which are always included;
  - **entity matches**: memories tagged with a person, pet or place named in the user's message, or tagged with the responding teller;
  - the top semantic matches to the user's message above a similarity floor.

  The union is capped at a fixed count. The ranker receives the same selection without the teller-entity part.
- **Lightweight entities instead of a graph.** Each memory carries a small list of entity tags: lower-cased names, plus teller IDs when the fact is about the user's interaction with that teller.
- **Rank in application code.** Vectors are stored as JSON on the memory row and ranked by cosine similarity in TypeScript. At single-user scale (hundreds of rows) this is instant, and it keeps the store testable with the in-memory database. pgvector stays available for when scale requires it.

## Consequences

- Prompts carry a bounded, relevant memory set, and stale facts are updated instead of duplicated.
- Each teller recalls the user's history with that teller.
- A second local model (the embedder) must be pulled. If embedding fails, the memory is still saved and recall falls back to core and entity matches.
- Memory rows gain `kind` (core or detail), `entities` and `embedding` fields. Consent revocation and conversation deletion still remove them, because they live on the same row.

## Validation

- Tests show that consolidation updates rather than duplicates.
- Recall returns core, entity and semantic matches within the cap, and per-teller recall includes that teller's interaction memories.
- No hosted embedding endpoint is called.
- Revocation and conversation deletion remove the embeddings with their memories.
