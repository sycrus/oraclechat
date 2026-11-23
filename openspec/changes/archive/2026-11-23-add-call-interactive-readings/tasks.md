# Tasks

## 1. Backend: call turns lay out interactions

- [x] 1.1 Tests first: a call turn asking Mira, Sage, or Astra without details for a reading lays out the fan, toss or form, and emits the invitation as a `sentence` event.
- [x] 1.2 Drop the `!call` guards in `runTurn` and emit the spoken invitation; remove `NO_BIRTH_DETAILS_CALL_NOTE`.

## 2. Backend: the call flag on interactions

- [x] 2.1 Tests first: `call` is parsed, a non-boolean is rejected, a group conversation is rejected, and a reveal, sixth toss or submission with `call` streams `sentence` events while the saved text has no tags.
- [x] 2.2 Parse and validate `call` in `parseInteractionRequest` (a bad value is a 400 through `InteractionError`), check `assertCallable` in `interact`, and pass it to the interpretation's `replyAs`.

## 3. Frontend: the call panel

- [x] 3.1 Tests first: the view renders a `panel` inside the message panel above the input, opens when `panelKey` changes, and the panel content for each kind (fan, toss, form, spread, I Ching, chart, note).
- [x] 3.2 Add `panel` and `panelKey` to `CallOverlayView`, and a `callPanel` helper choosing the content.
- [x] 3.3 `CallOverlay`: track the call's reading message, post interactions with `call: true`, speak their sentences, and send suggested questions as call turns.
- [x] 3.4 CSS: panel layout and scrolling, tarot strip inside the panel, sheet layer above the call.

## 4. Verification

- [x] 4.1 Run a call with each of Mira, Sage and Astra on the live build; screenshot the interactive card and the result at 390px. (Astra's form in a call is covered by tests only: the owner's birth details are saved, so she reads at once.)
- [x] 4.2 ADR alignment check against ADR-0002, 0013, 0015–0020; run `pnpm test` and `pnpm lint` (includes `pnpm adr:check`); run `graphify update .`.
- [x] Test, then build: pixel tarot cards (24×36, recognisable symbols, suit counts, court crowns) in the call's card strip.
