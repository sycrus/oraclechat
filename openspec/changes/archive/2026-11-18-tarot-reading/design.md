# App-owned tarot reading design

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007

## Design

- A pure application draw function selects from the 78-card tarot deck, fixes positions per spread, and assigns orientation.
- The user message stores the reading as JSONB. Every selected teller receives the same reading in its input.
- A `tarot_spread` SSE event updates the optimistic message; persisted user messages restore the spread after reload.
- The chat renders placeholder cards directly and does not parse model-generated UI instructions.

## TDD seams

- Draw seam: seeded random function verifies size, uniqueness, positions, and orientation domain.
- Persistence seam: Postgres-compatible adapter verifies the spread round-trips unchanged.
- Chat seam: service and SSE tests verify the application-generated spread is emitted and supplied to teller turns.
- UI seam: production build validates the interactive inline component; browser verification requires local services.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007

- Application-owned draws and local inference follow the single-user, local-first product boundary in ADR-0007.
- Tarot and persisted chat requirements are defined in `openspec/specs/tarot/spec.md` and `openspec/specs/chat/spec.md`.
