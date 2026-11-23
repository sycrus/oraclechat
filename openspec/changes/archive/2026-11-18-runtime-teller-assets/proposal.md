## Intent

Make the approved Mira and Sage definitions available in the production backend build so a real local app can load its MVP roster.

## Why now

The first PostgreSQL-backed startup exposed that TypeScript compilation omits YAML files. The server starts with an empty registry and rejects every conversation, despite the source-level registry tests passing.

## What changes

- Copy teller definition assets into the backend distribution during build.
- Verify the runtime asset-copy behavior with a focused test.

## Non-goals

- Changing teller profiles, selection behavior, or the public API.
- Changing deployment or model-provider architecture.

ADRs reviewed: ADR-0001, ADR-0005, ADR-0007
