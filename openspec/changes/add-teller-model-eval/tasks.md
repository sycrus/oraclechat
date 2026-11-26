## Tasks

### 1. Checks (TDD)
- [x] 1.1 Write failing tests in `tests/eval/checks.test.ts` for draw use, invented items (tarot, I Ching, astrology), character and right-teller checks; implement `src/eval/checks.ts`; rerun: pass.

### 2. Runner
- [x] 2.1 Add `eval/cases.ts` (24 cases), `eval/compare-models.eval.ts`, `vitest.eval.config.ts`, the `eval:models` script, and git-ignore `eval/results/`.

### 3. Verification and alignment
- [x] 3.1 Run `eval:models` live on local Qwen and the hosted OpenAI model; review the summary and transcripts.
- [x] 3.2 ADR alignment check against design.md; sync the delta spec into `openspec/specs/runtime/spec.md`; run `pnpm test` and `pnpm lint`; run `graphify update .`.
