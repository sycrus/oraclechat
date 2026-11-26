## Context

- `chat-workspace.tsx` `applyTellerEvent`: `message_start` appends an empty teller message and sets `streaming`; each `message_chunk` appends text to it; `message_complete` replaces it with the saved copy and counts a completed reply. Interaction reveals (fan, toss, birth form) stream their interpretation through the same events.
- `chat-view.tsx` renders a teller message with `MessageBubbles` (one bubble per paragraph, split by `splitParagraphs` in `message-body.tsx`), "Reading the moment…" while its content is empty, then its reading widgets. A separate thinking bubble with `.thinking-dots` shows while `isAwaitingTeller` is true, and the header says "typing…" while awaiting or streaming.
- Frontend tests are pure functions and `renderToStaticMarkup`; there is no DOM test environment.
- Calls (`call-overlay.tsx`) speak `sentence` events and are separate from the chat thread.

## Decision

- **Pure pacing module, `lib/typing-pace.ts`:**
  - `typingDelayMs(text, random)`: `(800 + 30 × characters) × (0.8 + 0.4 × random())`, clamped to 1,000–6,000 ms. About 2 s for a 40-character line, and the 6 s cap at roughly 200 characters.
  - `paceView(replies, shown)`: for live replies in arrival order (`{ id, content, complete }`) and the number of bubbles shown per reply, returns each reply's view: `{ bubbles, typing, hidden }`. A finished reply (complete, all bubbles shown) shows every bubble. The first unfinished reply shows its shown bubbles plus typing dots. Every later reply is hidden. A complete reply with no text finishes at once.
  - `nextReveal(replies, shown, lastRevealAt, random)`: the next bubble to show and when: `{ id, at }`, where `at = lastRevealAt + typingDelayMs(next paragraph)`. A paragraph is ready when a later paragraph has started or the reply is complete. Returns `null` when nothing is ready.
- **State and timers (`chat-workspace.tsx`):** `live` (reply ids with `complete`), `shown` (bubbles per id) and `lastRevealAt`. `message_start` adds a live reply; `message_complete` marks it complete. Sending a message, opening a chat, or a failed turn clears `live`, which shows everything (non-live messages are never paced). `lastRevealAt` is set when the user sends or interacts, and on each reveal. An effect schedules one timeout for the current `nextReveal`, keyed by reply id and bubble index, so a delay is drawn once per bubble.
- **Rendering (`chat-view.tsx`):** a new optional `pace` prop (id → view). A paced reply renders only its first `bubbles` paragraphs, then a typing bubble (`.thinking-dots`) while `typing`. Its sender name shows with the typing bubble, and its reading widgets only once `bubbles ≥ 1` or it is finished. A hidden reply renders nothing. The generic thinking bubble is not shown while a paced reply is typing, and the header says "typing…" while any reply is typing.

Rejected:
- **Whole reply at once / dots then stream.** The owner chose bubble by bubble.
- **Pacing in the backend.** It would slow calls and saving, and couple presentation to the API.
- **Pausing from when each paragraph is ready.** Counting from the previous bubble means slow generation doesn't add to the pause.

## Verification

Test-first:
- `typingDelayMs`: grows with length; stays within 1,000–6,000 ms at random 0 and 1; a long paragraph hits the cap.
- `paceView`: a finished reply shows all bubbles; a reply with one of three paragraphs shown shows one bubble and typing; the reply after an unfinished one is hidden; a complete empty reply is finished.
- `nextReveal`: the last paragraph of an incomplete reply is not ready; when complete it is, at `lastRevealAt` plus its delay; the second reply waits for the first; `null` when everything is shown.
- `ChatView` static render with `pace`: one bubble of two plus typing dots; no reading until the first bubble; a hidden reply renders nothing; no generic thinking bubble while typing.

Then a live check in the app: a one-teller reading and a group reply look paced, and sending mid-reveal shows the rest at once.

## ADR alignment

- ADR-0019: compliant. The messaging layout is modelled on a mainstream messaging app; typing dots and bubble-by-bubble arrival follow it, using the existing pixel `.thinking-dots`.
- ADR-0017: interactive readings are unchanged; they appear with their reply's first bubble.
- ADR-0015 and ADR-0020: calls are not paced; they speak released sentences as before.
- ADR-0021: guarded sentence release happens upstream in the backend; pacing only delays how released text is shown.
- ADR-0001: specified in OpenSpec before implementation.

ADRs reviewed: ADR-0001, ADR-0015, ADR-0017, ADR-0019, ADR-0020, ADR-0021
