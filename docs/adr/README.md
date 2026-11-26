# Architecture Decision Records

ADRs record durable product-boundary and architecture decisions. OpenSpec changes define the work; ADRs explain the decisions that work must respect.

## Current decisions

- [ADR-0001: Oracle product boundary and source of truth](0001-oracle-product-boundary.md) — Accepted
- [ADR-0002: Local-first model execution](0002-local-first-model-execution.md) — Accepted
- [ADR-0003: Agents SDK orchestration](0003-agents-sdk-orchestration.md) — Accepted
- [ADR-0004: OpenTelemetry-first observability](0004-opentelemetry-first-observability.md) — Accepted
- [ADR-0005: Remove legacy prototype runtime](0005-remove-legacy-prototype-runtime.md) — Accepted
- [ADR-0006: Retire legacy frontend and design system](0006-retire-legacy-frontend.md) — Accepted
- [ADR-0007: Self-hosted single-user MVP and local relevance ranking](0007-single-user-local-mvp.md) — Accepted (participation threshold superseded by ADR-0008)
- [ADR-0008: Both group tellers always respond](0008-group-tellers-always-respond.md) — Accepted (supersedes the ADR-0007 participation threshold; amended by ADR-0021 for care turns)
- [ADR-0009: Relevance-filtered memory recall with local embeddings](0009-relevance-filtered-memory-recall.md) — Accepted (ranker memory clause superseded by ADR-0012)
- [ADR-0010: Production profile is the owner's PC with supervised local services](0010-production-profile-owner-pc.md) — Accepted
- [ADR-0011: User-triggered web search through Brave](0011-user-triggered-web-search.md) — Superseded by ADR-0012
- [ADR-0012: Tellers act on their own: readings on request, lookups and pasted links](0012-teller-led-readings-and-lookups.md) — Accepted (supersedes ADR-0011)
- [ADR-0013: One discipline per teller, with an app-owned reading method](0013-one-discipline-per-teller.md) — Accepted
- [ADR-0014: Optional hosted teller replies through an OpenAI-compatible API](0014-hosted-teller-replies.md) — Accepted
- [ADR-0015: Local voice calls with a 3D teller](0015-local-voice-calls.md) — Accepted
- [ADR-0016: Local speech recognition for calls](0016-local-speech-recognition.md) — Accepted
- [ADR-0017: Interactive readings are an app-owned catalog of message kinds](0017-interactive-readings-catalog.md) — Accepted
- [ADR-0018: Astrology from consented birth details and an app-computed chart](0018-astrology-birth-details-and-charts.md) — Accepted
- [ADR-0019: OracleChat pixel design system and messaging layout](0019-oraclechat-pixel-design-system.md) — Accepted
- [ADR-0020: Interactive readings and the birth-details form in calls](0020-interactive-readings-in-calls.md) — Accepted
- [ADR-0021: Opt-in OpenAI guardrails, enabled only by a separate launch command](0021-opt-in-openai-guardrails.md) — Accepted

## Workflow

1. Before proposing or designing a change, review every Accepted ADR that could affect it.
2. Add `ADRs reviewed: ADR-####, ...` to `proposal.md`; write `ADRs reviewed: none` only when no ADR applies.
3. Add an `## ADR alignment` section to `design.md`. Repeat the same ADR review line and explain how the design complies or differs.
4. If a change introduces or alters a durable architecture decision, add a Proposed ADR in the same OpenSpec change. Do not silently contradict an Accepted ADR; explicitly supersede it.
5. Add a final task to verify ADR alignment. Run `pnpm adr:check`; the same structural check runs as part of `pnpm test` and `pnpm lint`.
6. A reviewer checks the OpenSpec proposal/design against the cited ADRs and confirms that deviations have a superseding decision.

Accepted ADRs are immutable decision records. To change one, create a new ADR that names the decision it supersedes and update this index. Do not edit an Accepted decision in place.

## Status values

- **Proposed** — awaiting review; implementation must not depend on it as an accepted constraint.
- **Accepted** — current decision.
- **Superseded** — replaced by a later ADR; retained for history.
- **Deprecated** — no longer recommended, with no direct replacement yet.

## Creating an ADR

Copy [`template.md`](template.md) to the next available `NNNN-kebab-case.md` filename. Include the context, decision, consequences, and a concrete validation method. Add it to the index and reference it in the related OpenSpec proposal and design.
