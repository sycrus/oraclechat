# Persistent chat and teller orchestration design

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0007

## Design

- Add a PostgreSQL `ChatStore` for conversations, ordered teller membership, and attributed messages. Keep SQL schema idempotent and run it during service startup.
- Add a Sage YAML definition and keep Mira's existing tarot definition, with a reciprocal rapport relationship.
- Use one local Agents SDK call to return structured teller scores. Validate IDs and score bounds before selection. The highest-ranked teller always responds; the second responds at or above the configured threshold. Resolve ties by least-recently-spoken.
- Stream selected teller text via the Agents SDK stream. Persist the complete teller message after the stream finishes. The next teller receives the prior response in its input.
- Use same-origin Next.js route handlers as a proxy to the local Express service. Render a desktop conversation list and one chat pane; no visual reading component is added in this change.

## TDD seams

- Storage seam: `ChatStore` methods, tested with a Postgres-compatible in-memory test adapter. It verifies repository behavior but does not replace a real PostgreSQL smoke check.
- Routing seam: `selectGroupResponders` and rank output validation, tested with scripted scores and fixed last-spoken times; these tests do not test local model quality.
- HTTP seam: Express conversation/message endpoints, tested with an injected store and scripted runtime; verifies JSON and SSE behavior without starting PostgreSQL or Ollama.
- UI seam: Next production build plus a browser flow against the running local services; manual/browser verification complements unit tests.

## TDD approach

Implement one vertical slice at a time: conversation creation/list/detail storage; direct 1:1 response; group ranking and tie/threshold selection; streamed ordered group replies; then the UI. Write a failing public-boundary test before each slice. Use actual local services for a final smoke check when installed.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0007

- Local model calls, app-owned routing, OTel privacy, the retired legacy UI, and the two-teller single-user scope follow ADR-0002 through ADR-0007.
- The product behavior remains governed by `openspec/specs/chat/spec.md`, `openspec/specs/orchestration/spec.md`, and `openspec/specs/tellers/spec.md` per ADR-0001.
