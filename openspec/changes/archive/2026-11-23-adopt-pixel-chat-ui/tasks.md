# Tasks

## 1. Setup

- [x] 1.1 Get the owner's acceptance of ADR-0019 (Proposed → Accepted, index updated); verify `pnpm adr:check` passes.
- [x] 1.2 Bundle Handjet and Pixelify Sans woff2 files with `OFL.txt` under `frontend/app/src/app/fonts/`; wire them in `layout.tsx` with `next/font/local` as `--font-body` / `--font-title`.

## 2. Backend last message, test-first

- [x] 2.1 Write failing `backend/agent/tests/chat/preview.test.ts`: Markdown emphasis, headings, list markers and links stripped; whitespace collapsed; cut to 80 characters. Implement `chat/preview.ts`; rerun: pass.
- [x] 2.2 Write failing store cases in `tests/chat/store.test.ts`: a summary carries the newest message's sender and preview; an empty conversation has none. Add `lastMessage` to `ConversationSummary` and the store query; rerun: pass.

## 3. Pure frontend helpers, test-first

- [x] 3.1 Write failing `lib/chat-list.test.ts` (time labels today, yesterday, weekday, date; "You: " and group sender prefixes; case-insensitive title filter). Implement `lib/chat-list.ts`; rerun: pass.
- [x] 3.2 Write failing `lib/thread.test.ts` (tails on the first bubble of a run; names only in groups; single tick while waiting, double once a teller follows). Implement `lib/thread.ts`; rerun: pass.
- [x] 3.3 Write failing cases for `trigrams()` in `lib/iching.test.ts` (hexagram 24 → Thunder below, Earth above). Implement; rerun: pass.
- [x] 3.4 Write failing `lib/suggestions.test.ts` (I Ching names the top changing line; chart names the selected planet and sign; at most three). Implement; rerun: pass.
- [x] 3.5 Write failing `lib/call/palette.test.ts` (16 colours; exact colours map to themselves; a midpoint maps to the nearer one). Implement; rerun: pass.

## 4. Design system, test-first

- [x] 4.1 Write failing `app/design-tokens.test.ts`: every colour literal in `globals.css` is a palette token; `layout.tsx` uses `next/font/local` only. Rewrite `globals.css` around tokens and the stepped-shape classes; rerun: pass.
- [x] 4.2 Write failing `app/icons.test.tsx`: each icon renders a 16×16 `crispEdges` svg hidden from assistive technology. Implement `icons.tsx` with the canvas paths; rerun: pass.

## 5. Screens, test-first

- [x] 5.1 Write failing `chat-list.test.tsx` (wordmark, search, group row with two avatars and "Sage: " preview, time label, named new-chat button). Implement `chat-list.tsx`; rerun: pass.
- [x] 5.2 Write failing `new-chat.test.tsx` (every teller listed; "New group" mode with the create button disabled until two are ticked). Implement `new-chat.tsx`; rerun: pass.
- [x] 5.3 Write failing `chat-view.test.tsx` (group header members, no call button in groups, call button 1:1, "Delete chat" in the menu, tails and names per run, tick names). Implement `chat-view.tsx`, moving message rendering from the workspace; update `message-body.test.tsx` for name-per-run; rerun: pass.
- [x] 5.4 Write failing `you-panel.test.tsx` (memory consent, hosted sharing when hosted, birth details, clear history). Implement `you-panel.tsx`; rerun: pass.
- [x] 5.5 Refactor `chat-workspace.tsx` into the shell with `view` state, nav tabs and the 900px two-pane layout; `send` takes text so the suggestion chips can reuse it; run all frontend tests.

## 6. Readings, test-first

- [x] 6.1 Update `coin-toss.test.tsx` for the compact card (pips, "N of 6", rows top to bottom, empty outlines, accent changing lines, legend hidden until "?") keeping the accessibility cases. Rewrite `coin-toss.tsx`; rerun: pass.
- [x] 6.2 Write failing I Ching card and sheet tests (24 → 23 card, "Line by line", sheet dialog with meanings, trigrams, changing lines, suggestions). Implement in `iching-view.tsx`; rerun: pass.
- [x] 6.3 Write failing birth invite tests (open: "Add birth details"; submitted: "Submitted", no button; set aside: says so). Implement `birth-invite.tsx` and the full-screen sheet; keep `birth-details-form.test.tsx` passing; rerun: pass.
- [x] 6.4 Update `chart-wheel.test.tsx` into summary and view tests (big three, transit chips with count, "Open full chart"; tabs; selected planet text; non-overlapping markers; placement text for screen readers). Implement; rerun: pass.
- [x] 6.5 Restyle the tarot spread, card fan and signature card to the tokens; existing tests pass.

## 7. Video call, test-first

- [x] 7.1 Update `call-overlay.test.tsx` view cases for the new layout (title, status line, messages control opening the typed input, input open when the mic is blocked, end control). Rewrite `call-overlay-view.tsx`; rerun: pass.
- [x] 7.2 Add the low-resolution render target and palette quantize pass to `vrm-stage.ts` with the unfiltered fallback; verify in a running call that the teller is pixelated and animates as before.

## 8. Verification

- [x] 8.1 Run the app and screenshot the list, a chat, a coin toss, an I Ching sheet, the birth form, the full chart and a call at 1280px and 390px; compare with the canvas and fix gaps.
- [x] 8.2 ADR alignment check: confirm the design against ADR-0001, 0002, 0006, 0008, 0010, 0013, 0015–0019; run `pnpm test` and `pnpm lint` (includes `pnpm adr:check`); run `graphify update .`.

## Fixes from the live flow check

- [x] Regression test, then fix: a picked fan card stays gold while hovered (a tapped card keeps `:hover` on phones).
- [x] Regression test, then fix: the open chat's header takes the server's new title when the list refreshes (`withListTitle`).
- [x] Regression test, then fix: a teller avatar on `var(--raised)` stays visible on a selected chat row.
- [x] Regression test, then build: teller profile pictures (Mira's portrait, Sage's morning tea, Astra's rooftop) replace the discipline icons in avatars.
- [x] Test, then build: pixel tarot card backs in the fan, inverting to gold when picked.
- [x] Test, then change: chat rows and headers are named after the tellers like WhatsApp contacts; search matches names, topics and last messages.
- [x] Test first, then build: one conversation per correspondent (creating a chat for an existing teller set returns it); the list never duplicates it.
- [x] Test first, then build: WhatsApp-style day pills in the thread, pinned while scrolling.
- [x] Back up the owner's database, then keep only the newest chat per correspondent (backup: `%LOCALAPPDATA%\oracle-backupsgent_memory-20261123-213725.dump`; 13 chats → 4).
- [x] Test, then change: the chat's tarot cards and action card use the pixel tarot cards; a reply's words come before its cards, action card, I Ching card or chart.
- [x] Test, then change: the call puts the typed input, send, mic and end call on one bottom bar, and frames phones on the head and shoulders.
