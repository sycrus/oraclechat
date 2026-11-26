## Tasks

### 1. Backend (TDD)
- [x] 1.1 Write failing tests for `traceContentEnabled` (accepted and rejected values) and for content on `runLocalAgent` and `streamLocalAgent` spans when `TRACE_CONTENT=1`, plus none with `TRACE_CONTENT=0`; implement the switch in `observability/otel.ts` and the recording in `agent/runtime.ts`; rerun: pass.
- [x] 1.2 Add the startup warning to `initTelemetry`.

### 2. Docs
- [x] 2.1 Add `TRACE_CONTENT` to `.env.example` and `docs/operations.md`, including that LangSmith receives content when configured.

### 3. Verification and alignment
- [ ] 3.1 Live check: with `TRACE_CONTENT=1`, a chat turn shows its prompt and reply in local Langfuse; with it unset, Input and Output stay empty.
- [ ] 3.2 ADR alignment check against design.md; sync the delta spec into `openspec/specs/runtime/spec.md`; run `pnpm test` and `pnpm lint`; run `graphify update .`. *(Spec synced, tests, lint and graph update done; awaiting 3.1 before archiving.)*
