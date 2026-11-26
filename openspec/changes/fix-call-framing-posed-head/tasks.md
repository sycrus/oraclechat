## Tasks

### 1. Framing (TDD)
- [x] 1.1 Write failing `framing.test.ts` cases: `frameHead` returns `x` equal to the head's `centerX`; existing fixtures gain `centerX`. Implement `centerX`/`x` in `framing.ts`; rerun: pass. *(2026-11-27: the 2 new cases failed first — `x` undefined — then pass.)*
- [x] 1.2 Remove `shiftHead` and its test.

### 2. Stage
- [x] 2.1 `vrm-stage.ts`: pin the normalized hips' x/z to rest after every mixer update; measure head vertices through `applyBoneTransform` in the idle clip's first (pinned) frame with `base` from the posed head bone; place and aim the camera at `framing.x`. `pnpm --filter @oracle/frontend test` and `tsc` pass.

### 3. Verification and alignment
- [x] 3.1 Live check on a dev server (port 3001, production untouched): phone screenshots of Milo, Mira, Sage and Astra at 3, 5.5, 8 and 10.5 s show each head whole, centred and steady, framed head-and-shoulders; Milo speaking in `?say=1` keeps his head in frame through the talking gestures. *(2026-11-27. Before: Milo drifted ~10 cm and his head left the phone frame.)*
- [x] 3.2 ADR alignment check against design.md; run `pnpm test` and `pnpm lint`; run `graphify update .`. *(2026-11-27: ADR-0015 and ADR-0019 hold; `pnpm test` (333 frontend, 495 backend) and `pnpm lint` pass; `graphify update .` succeeded.)*
- [ ] 3.3 Owner: rebuild production with the stack stopped and look at a real call on the phone.
