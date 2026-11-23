## Intent

Define the teller schema — the structured definition of a fortune teller character — so that every other feature (chat, relevance scoring, memory, RAG) has a stable contract to build against.

## Why now

Every feature in Oracle depends on knowing what a teller is. The chat UI needs to render avatars and names. The orchestrator needs activation profiles for relevance scoring. The RAG system needs to know which discipline's knowledge base to search. Memory needs to track per-teller-user relationships. Without this schema, nothing else can be built or tested.

## What changes

- ADDED teller definition schema (TypeScript type + Zod validation)
- ADDED teller registry service (loads, validates, and serves teller definitions)
- ADDED first teller definition file as a working example (not the final character — just a valid instance for testing)

## Non-goals

- Defining all teller characters (that's a separate change per character)
- Building the chat UI or orchestration logic
- Implementing relevance scoring or agent-runtime orchestration
- Building the RAG pipeline

ADRs reviewed: ADR-0001, ADR-0003, ADR-0005, ADR-0007
