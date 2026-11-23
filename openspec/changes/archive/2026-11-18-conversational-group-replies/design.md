## Context

`ChatService.sendMessage` ranks group tellers, then `selectGroupResponders` admits the second teller only at `TELLER_PARTICIPATION_THRESHOLD` (0.6). The frontend (`chat-workspace.tsx`) renders `message.content` as plain text in one bubble and only shows "Reading the moment…" after `message_start`, so the ranker call and the gap between tellers show nothing. Streaming itself works (hundreds of `message_chunk` events per reply).

## Decision

- **Ordering, not gating.** `selectGroupResponders(scores, lastSpokenAt)` returns every scored teller ordered by score, ties broken by least-recently-spoken. The `threshold` option, env var, and span attribute are removed; the participation span records the ordered responders.
- **Paragraph bubbles in the UI only.** A new `message-body.tsx` exports `splitParagraphs(text)` (split on blank lines, drop empties) and `MessageBubbles`, which renders one bubble per paragraph through `react-markdown` (raw HTML is not rendered by default). Persistence and SSE are unchanged, so reloaded history renders the same way and streaming naturally grows the last bubble.
- **Thinking indicator from known counts.** Because both tellers always reply, the expected reply count is the conversation's teller count. The workspace tracks completed replies and the currently streaming message; `isAwaitingTeller({ busy, streaming, completed, expected })` is true when busy, nothing is streaming, and fewer than `expected` replies have completed. This avoids showing the indicator during post-reply memory extraction.

Rejected: splitting replies into multiple persisted messages in the backend (changes storage and history context for the second teller); asking the model to emit separate messages (unreliable with local models).

## Verification

Test-first: ranker selection returns both tellers for low scores; ChatService streams both tellers for a low second score; `splitParagraphs` and `MessageBubbles` render bold Markdown, escape HTML, and give the byline only to the first bubble; `isAwaitingTeller` covers before-start, between tellers, and after completion. Then a live group turn in the app.

## ADR alignment

- ADR-0007's participation threshold is superseded by Proposed ADR-0008; its other decisions are unchanged.
- ADR-0003: application code still owns selection and ordering; each reply stays attributed and the second teller still receives the first reply.
- ADR-0004: traces keep scores and teller IDs only, no content.
- ADR-0001 and ADR-0006: behavior is specified here first; the UI change stays inside the current Oracle frontend, adding only `react-markdown`.

ADRs reviewed: ADR-0001, ADR-0003, ADR-0004, ADR-0006, ADR-0007, ADR-0008
