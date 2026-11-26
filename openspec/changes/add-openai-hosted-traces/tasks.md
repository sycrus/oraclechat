## Tasks

### 1. ADR
- [x] 1.1 Add ADR-0022 (Proposed) and index it, noting the superseded ADR-0004 clauses.

### 2. Backend (TDD)
- [x] 2.1 Write failing tests for `OPENAI_TRACES` in `loadHostedModelConfig` (values, missing hosted config, non-OpenAI base URL); implement; rerun: pass.
- [x] 2.2 Write failing tests in `tests/runtime/openai-traces.test.ts`:
  - no trace for local or untraced hosted runs;
  - one named trace with the key and OTel trace ID for a traced hosted run;
  - a local run after a traced run is still untraced;
  - content only with `TRACE_CONTENT`.

  Implement in `agent/runtime.ts`; rerun: pass.
- [x] 2.3 Flush Agents SDK traces in `shutdownTelemetry`; log at startup when OpenAI traces are on.

### 3. Docs
- [x] 3.1 Add `OPENAI_TRACES` to `.env.example` and `docs/operations.md`.

### 4. Verification and alignment
- [ ] 4.1 Live check: a hosted reply shows in the OpenAI Traces dashboard; grade a few there. *(2026-11-26: smoke and eval hosted replies appear under Logs → Agents SDK as `Oracle teller reply` with the teller in metadata; local routing calls do not. Grading is left to the owner.)*
- [x] 4.2 ADR alignment check against design.md; accept ADR-0022; sync the delta spec into `openspec/specs/runtime/spec.md`; run `pnpm test` and `pnpm lint`; run `graphify update .`.
