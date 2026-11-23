## Tasks

### 1. Facing correction (TDD)
- [x] 1.1 Failing `pose.test.ts` cases for `facingCorrection`: zero yaw gives zero; a small turn is mostly kept; a 24° turn ends within 8°; the corrected yaw keeps its sign; the correction is symmetric. Implement in `pose.ts` and rerun the focused tests. Result: 6 new cases failed first, then pass.
- [x] 1.2 Failing `pose.test.ts` case for `FACE_DOWN` (about 6°); add it to `pose.ts` and tilt the head by it in the stage. Result: failed first, then passes.

### 2. Stage
- [x] 2.1 `vrm-stage.ts`: store the head's rest forward direction; after the mixer update and thinking slerp, apply `facingCorrection` scaled by `1 − thinking` to the normalized head. Verify `pnpm --filter @oracle/frontend test` and `tsc` pass. Result: 311 frontend tests and `tsc` pass.

### 3. Verification and alignment
- [ ] 3.1 Live call: the teller's face stays toward the camera, tilted slightly down, while speaking with each talking clip, and thinking still turns the head away.
- [x] 3.2 Check ADR alignment; run `pnpm test`, `pnpm lint` (includes `pnpm adr:check`) and `graphify update .`. Result: ADR-0015 and ADR-0019 hold; `pnpm test` (311 frontend, 421 backend) and `pnpm lint` pass. No `graphify-out/` exists in this checkout, so there was no graph to update.
