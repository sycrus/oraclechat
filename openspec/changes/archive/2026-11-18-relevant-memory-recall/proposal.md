## Intent

Send each teller only the memories that matter for this message and this teller. Keep the memory set current instead of letting it grow with duplicates and stale facts.

## Why now

With consent on, every saved memory goes to the ranker and to both tellers on every turn. Memories are only ever appended. This wastes context (#12), pulls unrelated details into readings, and keeps outdated facts. Users also form a relationship with each teller, so a teller should remember what the user told *them*.

## What changes

1. **Consolidation.** The memory distiller receives the existing memories and returns `add` and `update` operations, so new facts replace outdated ones instead of duplicating them. It also labels each fact as `core` (identity-level: name, pronouns, key relationships) or `detail`, and tags its entities.
2. **Local embeddings.** Each memory is embedded with a local Ollama model (`OLLAMA_EMBED_MODEL`, default `nomic-embed-text`) when it is added, updated or edited.
3. **Relevance recall.** Each turn, the application selects memories per teller:
   - all `core` memories;
   - entity matches;
   - the top semantic matches above a similarity floor;
   - all capped at 8 memories.
4. **Entities, including each teller.** Memories carry lower-cased entity tags (people, pets, places). Facts about the user's interactions with a teller carry that teller's ID, so they are recalled when that teller replies.
5. **User controls.** The memory panel shows a pin toggle (pinning makes a memory `core`). Editing re-embeds the memory.

## Non-goals

- GraphRAG, community summaries or an entity graph store (ADR-0009).
- Hosted embedding services (ADR-0002).
- Letting the model delete memories. Deletion stays a user action.
- Separate memory spaces per teller. Memories stay one consented, user-owned set; teller tags only steer recall.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0009
