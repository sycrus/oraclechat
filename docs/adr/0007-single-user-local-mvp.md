# ADR-0007: Self-hosted single-user MVP and local relevance ranking

**Status:** Accepted  
**Date:** 2026-11-18  
**Supersedes:** None

## Context

Oracle's first release is intended for a single user running the application locally. The initial product is focused on two tarot tellers, and group participation must reflect each teller's activation profile while allowing an optional second response. The existing OpenSpec mentioned Parlant as the relevance evaluator, which conflicts with the Agents SDK direction in ADR-0003.

## Decision

The first usable release is a self-hosted, single-user application using local PostgreSQL/pgvector and Ollama as the initial inference runtime. The development target is Windows 11 with an NVIDIA RTX 5080 (16 GB VRAM); this does not guarantee production hardware sizing.

Application-owned orchestration uses a local model to rank eligible tellers using their activation profiles (topics, emotional tones, and situations), the current message, and consented user context. The highest-ranked teller always responds in group chat. A second teller responds only when their relevance score meets the MVP participation threshold. Ties are resolved by least-recently-spoken. The threshold is an application policy value validated with acceptance scenarios; threshold selection is not delegated to Parlant or an external orchestration service.

## Consequences

- The local model and runtime must return structured scores suitable for deterministic ordering and threshold comparison.
- Acceptance tests define expected ranking, threshold inclusion, and tie behavior independently of model-generated prose.
- The MVP does not require multi-user authentication, a hosted model, or a production inference host decision.
- Replacing Ollama, adding hosted providers, or changing deployment scope requires a later decision/change.

## Validation

OpenSpec scenarios and automated acceptance tests cover single-user local operation, profile-based ranking, top-teller response, second-teller threshold behavior, and least-recently-spoken tie-breaking. A local run succeeds without an OpenAI API key.
