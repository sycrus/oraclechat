## Context

`tsc` emits JavaScript under `backend/agent/dist`, but does not copy `src/tellers/definitions/*.yaml`. `server.ts` resolves the definitions relative to its compiled module, so production startup reads an empty directory.

## Decision

Add a small asset-copy module that copies the source YAML definition directory to the matching location under `dist`. Invoke it after TypeScript compilation. Keep runtime loading unchanged so source and distribution layouts share the same relative path.

## Testing

Unit-test the copy function with a temporary source and destination. Then build the backend and run the live service against local PostgreSQL and Ollama to confirm the roster is loaded and persisted chat works.

## ADR alignment

The implementation complies with the accepted local-first, Agents SDK, and single-user MVP decisions; it only packages existing local teller definitions.

ADRs reviewed: ADR-0001, ADR-0005, ADR-0007

