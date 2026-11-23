## Tasks

### 1. Both tellers respond (TDD)
- [x] 1.1 Change ranker selection tests: both tellers selected for any scores, ordered by score then least-recently-spoken.
- [x] 1.2 Add a ChatService test where a low-scored second teller still responds.
- [x] 1.3 Remove the participation threshold from selection, ChatService options, server wiring, `.env.example`, and the participation span.

### 2. Reply presentation (TDD)
- [x] 2.1 Add failing tests for `splitParagraphs` and `MessageBubbles` (Markdown bold, no raw HTML, byline on first bubble only).
- [x] 2.2 Add `react-markdown` and implement `message-body.tsx`; use it in the chat workspace.
- [x] 2.3 Add failing tests for `isAwaitingTeller`; implement it and render the thinking indicator.

### 3. Verification and alignment
- [x] 3.1 Run a live two-teller turn and confirm both replies, bubbles, Markdown, and the indicator. (Verified 2026-11-18 in Chrome: thinking indicator, both replies, paragraph bubbles, bold rendered, no raw `**`.)
- [x] 3.2 Add ADR-0008 to the ADR index; check ADR alignment; run `pnpm test` and `pnpm lint`.
