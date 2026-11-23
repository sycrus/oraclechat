# ADR-0008: Both group tellers always respond

**Status:** Accepted
**Date:** 2026-11-18
**Supersedes:** ADR-0007 participation-threshold decision (second teller responds only at or above the threshold)

## Context

ADR-0007 lets the second teller in a two-teller group respond only when its local relevance score meets a participation threshold. In live use the second teller is usually silent, which reads as a broken group chat: a user who chose two tellers expects to hear both. Silent skips also hid ranking problems because no trace showed the scores.

## Decision

In a two-teller conversation, both tellers respond to every user message. Application-owned local relevance ranking still runs once per group message and decides response order only: the higher score speaks first, and ties go to the teller who spoke least recently. The participation threshold is removed. One-to-one chats are unchanged and skip ranking.

All other ADR-0007 decisions (self-hosted single user, local PostgreSQL/pgvector, Ollama runtime, structured local ranking) remain in force.

## Consequences

- Group turns always produce two replies, roughly doubling local generation time per group message.
- `TELLER_PARTICIPATION_THRESHOLD` and the threshold trace attribute are removed.
- The ranker output contract is unchanged; only its use changes from gating to ordering.

## Validation

Orchestration tests assert that both tellers are selected for any valid pair of scores, ordered by score with the least-recently-spoken tie-break, and that one-to-one chats do not call the ranker.
