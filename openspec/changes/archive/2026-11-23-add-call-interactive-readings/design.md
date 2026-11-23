# Design

## Context

`ChatService.runTurn` lays out the fan, toss or birth form only when `call` is false; call turns get immediate readings, and Astra without details gets `NO_BIRTH_DETAILS_CALL_NOTE`. `interact` always replies with `call: false`, so an interpretation after a reveal is written as chat text, not spoken sentences. The call overlay listens to the turn stream for `sentence` events and shows `message_start.reading` as tarot cards (or a "see chat" note).

## Goals / Non-Goals

**Goals:** the fan, coin toss and birth form in a call, with the same rules as the chat; a spoken interpretation; a compact result in the call panel.

**Non-Goals:** speaking picks or tosses aloud; voice commands for picking ("the third card"); a new layout for the full chart or line-by-line sheets.

## Decisions

1. **One rule for chat and call turns.** Drop the `!call` guards in `runTurn`. When laying out an interaction in a call turn, also emit the invitation as a `sentence` event with a `relaxed` expression, so the call speaks it. The saved message is identical to the chat's. `NO_BIRTH_DETAILS_CALL_NOTE` goes away, because the form now appears.
2. **`call` on interactions.** `parseInteractionRequest` accepts an optional boolean `call`. The server rejects a non-boolean value with 400. When `call` is true, it runs `assertCallable` before streaming, and rejects with 400 for a group or an uncallable teller. `interact` passes `call` to the interpretation's `replyAs`. Picks and early tosses ignore it.
3. **Panel content is the latest call reading message.** The overlay keeps `reading: Message | null`. That is the last message from this call's turns that has an interaction or a reading, updated from `message_complete` and `message_update` events. The view gets a `panel` node rendered inside the message panel above the input, plus a `panelKey` that opens the panel whenever it changes. The node is:
   - open fan → `CardFan`; open toss → `CoinToss`; open form → `BirthInvite`;
   - revealed tarot → a compact spread strip (the existing tray, moved);
   - I Ching reading → `IChingCard`; chart → `ChartSummary`;
   - unknown reading data → the existing "see chat" note.
4. **Interactions from the call.** The overlay posts to the interaction endpoint with `call: true`. The reply stream feeds the same handler as a turn: `sentence` events are spoken, and `message_update` and `message_complete` update the panel. Suggested questions from the result cards (`onAsk`) are sent as call turns. When an interaction completes, `onTurnComplete` refreshes the chat.
5. **Sheets above the call.** `.sheet-layer` moves above `.call-overlay` (z-index 70 over 60), so the birth form, line by line and full chart open over the call.
6. **Panel height.** The panel scrolls inside `max-height: 55vh`, so the teller stays visible. The tarot strip scrolls sideways inside the panel, so no card is cut off.

## Risks / Trade-offs

- A full-screen birth form hides the teller while it's open. That's acceptable: it is a short form, and the call keeps running.
- Readings started in the chat and still open stay in the chat. The call only shows interactions laid out in its own turns, to keep the panel predictable.

## Migration Plan

No data changes. Existing open interactions keep working in the chat.

## ADR alignment

ADRs reviewed: ADR-0002, ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0020

- **ADR-0002 (local execution) and ADR-0013 (app-owned results):** unchanged. The app still deals, casts and computes. Invitations are fixed text, and the model only interprets.
- **ADR-0015 (calls) and ADR-0016 (open mic):** interpretations in a call are ordinary call replies with expression tags. Speech and the mic are untouched.
- **ADR-0017 (interactive catalog):** same kinds, same validated interactions. The "calls stay separate" bullet is superseded for these kinds by ADR-0020.
- **ADR-0018 (birth details):** consent, storage and privacy are unchanged. Only "calls never show the form" is superseded, by ADR-0020.
- **ADR-0019 (design system):** the panel reuses the chat's cards and tokens, with no new colours.
