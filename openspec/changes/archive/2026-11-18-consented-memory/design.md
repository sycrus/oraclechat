# Consent-based memory design

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007

## Design

- Store one local-user consent record and distinct memory rows in PostgreSQL; each memory has a foreign key to its source conversation.
- Keep memory access behind `MemoryService`; list and write operations check consent, revocation clears memories before disabling consent, and conversation deletion cascades.
- Run local fact extraction only after responses complete and only while consent is active. Invalid or unavailable extraction is best-effort and cannot fail the chat turn.
- Supply memory strings to local ranker/teller context only when consent is active; exclude raw content from telemetry attributes.
- Expose same-origin API routes and a UI panel for consent, viewing, editing, deletion, and revocation.

## TDD seams

- Store/service seam: pg-mem tests cover default-off consent, CRUD, revocation, and source cascade.
- Chat seam: injected ranker, teller, and extractor verify no memory context or extraction before consent and recall after consent.
- API seam: HTTP tests verify consent control and chat routing.
- UI seam: Next production build plus browser verification against local services.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007

- Local-only storage and inference follow ADR-0007. Memory consent and lifecycle requirements are in `openspec/specs/memory/spec.md`.
