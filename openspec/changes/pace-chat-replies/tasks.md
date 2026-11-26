## Tasks

### 1. Pacing rules (TDD)
- [x] 1.1 Write failing tests in `lib/typing-pace.test.ts` for `typingDelayMs`, `paceView` and `nextReveal` (design: Verification); implement `lib/typing-pace.ts`; rerun: pass.

### 2. Chat view (TDD)
- [x] 2.1 Write failing `chat-view` render tests with a `pace` prop (partial bubbles plus typing dots, readings with the first bubble, hidden reply, no generic thinking bubble while typing); implement in `chat-view.tsx`; rerun: pass.

### 3. Workspace wiring
- [x] 3.1 Track live replies, shown bubbles and `lastRevealAt` in `chat-workspace.tsx`; schedule reveals from `nextReveal`; clear on send, chat switch and failure. *(Pauses use `bubbleRandom`, a per-bubble hash, so a bubble's time is fixed across renders; the thread also scrolls when a bubble is revealed.)*

### 4. Verification and alignment
- [x] 4.1 Live check: a one-teller reading and a group reply arrive bubble by bubble with typing dots; sending mid-reveal shows the rest at once; a call is not paced. *(2026-11-26: the owner confirmed paced replies work in the running app after a rebuild. The group, mid-reveal send and call cases were not reported separately.)*
- [x] 4.2 ADR alignment check against design.md; sync the delta spec into `openspec/specs/chat/spec.md`; run `pnpm test` and `pnpm lint`; run `graphify update .`. *(Aligned with ADR-0019, ADR-0017, ADR-0015, ADR-0020 and ADR-0021 as the design states; spec synced.)*
