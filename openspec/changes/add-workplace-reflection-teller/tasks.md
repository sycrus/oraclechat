### 1. Specification and tests
- [x] 1.1 Add scenarios for Milo's discipline, tool catalog, context selection, optional short offers, informal personality framing and no company-fit verdict.
- [x] 1.2 Write failing tests for route tool enum validation, invalid-tool normalization and rejection of tools for other disciplines; observed the expected initial failures.
- [x] 1.3 Write failing tests for Milo registry loading, conversation eligibility and app-owned tool instruction delivery; observed the expected initial failures.

### 2. Implementation
- [x] 2.1 Add the workplace-reflection discipline and Milo's YAML definition; make the discipline conversation-eligible.
- [x] 2.2 Add the bounded workplace-tool route enum and router instructions; normalize invalid/missing values safely.
- [x] 2.3 Deliver the fixed app-owned reflection guidance to Milo when a tool is selected; preserve ordinary chat when none is selected.
- [x] 2.4 Add Milo to frontend roster and avatar presentation; verify the supplied VRM's humanoid and viseme metadata and integrate it with the existing call renderer.

### 3. Verification and alignment
- [x] 3.1 Run focused backend/frontend tests and lint; focused suites passed (backend 108, frontend 29).
- [ ] 3.2 Inspect a live chat for all seven tool patterns and a no-tool turn; verify offers can be declined and do not produce formal MBTI or company-fit judgments; visually inspect the call model.
- [ ] 3.3 Check ADR alignment and run `pnpm test`, `pnpm lint`, `pnpm adr:check`, and `graphify update .`. Tests, lint and ADR checks passed; `graphify update .` failed with `Failed to canonicalize script path`.
