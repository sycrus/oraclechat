## Context

Today `ChatService.sendMessage` (`backend/agent/src/chat/service.ts:119`) draws a reading with `drawFor` (`:293`) just before each teller replies and sends it in that teller's `message_start` (`:197`). Messages store `reading` and `signatureCard` as JSONB columns added with idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (`chat/store.ts:82-85`). The frontend validates with `parseTarotSpread` and renders in `chat-workspace.tsx:215`. Teller definitions are validated in `tellers/schema.ts` (rules at `:72`). Routes live in `server/app.ts`.

ADR-0017 (Proposed with this change) sets the rules for interactive kinds; this change is the first kind. See proposal.md for motivation and specs for requirements.

## Goals / Non-Goals

**Goals:**
- A fan whose card identities exist only on the server until the reveal, with picks that survive a reload.
- Reuse the existing reading, signature-card and interpretation machinery rather than a parallel path.

**Non-Goals:**
- A general plug-in system for kinds. One kind exists; the second (a coin toss for Sage) will show what to extract.
- Changing routing: the router still only says whether a reading is wanted and which spread.

## Decisions

### 1. Interaction state lives on the message, with server-only hidden data
A new nullable `interaction JSONB` column on `messages`, added with the same idempotent `ALTER TABLE`. Server shape:
`{ kind: "card-fan", state: "open" | "revealed" | "set-aside", spread, size, picks: number[], hidden?: FanCard[] }`, where `hidden` holds every fan card in order (name, orientation, art key, meaning) and is deleted at reveal (unpicked cards dropped) and at set-aside.

- *Alternatives:* a separate table (more joins for one small blob); hidden cards in memory only (lost on restart, so no resume); hiding them client-side (cards would reach the browser, which the spec forbids).

### 2. One public-view seam
A pure `publicMessage(message)` removes `hidden`. `ChatService` applies it on every read path and every emitted event (`message_complete`, interaction responses); the store keeps the full record. One leak test enumerates every route and stream event with a spy deck and asserts that no `hidden` key and no hidden card name appears before the reveal.

- *Alternatives:* strip in Express (easy to miss for SSE events); strip in the store (service internals need `hidden` to reveal).

### 3. Laying out the fan
In `sendMessage`, for a fan-enabled tarot teller with `reads && !call`: skip `drawFor` and the model. `drawFan(spread)` in `tarot/draw.ts` shuffles with the existing crypto-backed random and takes `positions + 6` cards (7, 9 or 16), each with an orientation. Save a teller message whose content is the definition's invitation and whose `interaction` is the fan, set aside any open fan from this teller in the conversation, then emit `message_start` and `message_complete` (public view). The router and its 12 routing cases are untouched: the fan is a presentation of a reading the router already asked for. The invitation counts as Mira's reply for ADR-0008, and the router's `previousReplies` sees it, so "yes, go ahead" still works.

### 4. Interaction route
`POST /api/conversations/:id/messages/:messageId/interactions` with `{ action: "pick" | "unpick" | "reveal", index? }`.
- `pick` and `unpick` return 200 `{ message }` (public view). Picking a picked card or unpicking an unpicked one changes nothing.
- `reveal` streams SSE like the messages route: a `message_update` (the public message with its reading and signature card), then the interpretation events as for any reply.
- 400 for a bad body, 404 for an unknown message or a message that isn't a fan, 409 for a state that doesn't fit (revealed, set aside, too many or too few picks).
- Transitions are compare-and-set in the store: `updateInteraction(messageId, expectedState, next)` runs `UPDATE … WHERE id = $1 AND interaction->>'state' = $2`, so two concurrent reveals cannot both win.

### 5. Reveal deals the spread
`dealFan(interaction, spread, signaturePosition)` (pure): the picked cards, in pick order, go to the spread's fixed positions with their stored orientations; `drawSignatureCards(dealt, [position])` adds the action card, distinct from the dealt cards. The message gets `reading` and `signatureCard`, state `revealed`, and `hidden` is dropped. The dealt spread therefore follows the existing spread rules and renders through `parseTarotSpread` unchanged.

### 6. Interpretation reuses the reply step
Extract the per-teller reply block of `sendMessage` (history, memories, instructions, streaming, span, append) into `private replyAs(...)`, first as a refactor under the existing tests with no behaviour change. The reveal then calls it with the dealt reading and the last user message as the text. The interpretation is saved without `reading`, so the cards render once, on the fan message; `referenceContext` already labels another teller's `reading` as reference, so later tellers see Mira's dealt reading with no change. `readingContext` gains one line saying the user picked these cards, in this order.

### 7. Teller definition
`fan: { invitation: string }`, optional, in the teller schema. The existing `superRefine` rejects it on any non-tarot teller or with an empty invitation. Mira's definition gets an invitation.

- *Alternatives:* a global flag (every tarot teller would get it, but per-teller interaction is the point); a code-level map (hides configuration from the definition).

### 8. Frontend
`lib/fan.ts` `parseCardFan(value)` checks kind, state, counts, unique in-range picks and positions matching the spread, mirroring `parseTarotSpread`. `app/card-fan.tsx` renders the cards as buttons named "card 4 of 9, face-down, picked", the "2 of 3 picked" count and the Reveal button; the flip is CSS and is off under `prefers-reduced-motion`. `chat-workspace.tsx` renders the fan in place of the spread for messages with an interaction, updates the message from pick and unpick responses, and handles `message_update`. The reveal route's events go through the same handler as a sent message (extracted if needed). After the reveal the message renders the spread as today.

### 9. Observability
An `oracle.interaction` span per request records kind, teller id, action and outcome only.

## Risks / Trade-offs

- [A path leaks `hidden`] → one seam (decision 2), a leak test that enumerates routes and events with a spy deck, and the key name is unique so grep finds any stray use.
- [A slow first token after the reveal] → the existing thinking indicator covers it; the model may need about 10 s after idle (ADR-0015 notes).
- [Fan state and a deleted or cleared conversation] → state lives on the message, so existing deletes cascade.
- [The group-chat reply order puts Mira's fan before Sage's reply] → accepted; Sage replies from the fan's invitation text and sees no cards.

## Migration Plan

Additive: a nullable column created at startup, no backfill, old messages unaffected. Rollback is reverting the commit; the extra column is harmless.

## Open Questions

- Whether the user can ask Mira to re-interpret after a failed interpretation (the cards stay revealed and an ordinary chat message may be enough). Deferrable: no spec or task depends on it.

## ADR alignment

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0006, ADR-0008, ADR-0009, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0017

- ADR-0002, ADR-0003: tools stay app-owned; no model call lays out or reveals the fan, and the model never emits a kind or payload.
- ADR-0004: interaction spans carry kind, teller, action and outcome only.
- ADR-0006: no legacy generative-UI code; the fan is a hand-written component.
- ADR-0008: Mira still responds to every turn she is routed to, first with the fan, then with her interpretation.
- ADR-0009: interactions are not messages, so they never reach memory extraction.
- ADR-0012: the router still decides whether and which reading; the fan only changes how a tarot reading is presented.
- ADR-0013: the app shuffles and stores the fan and deals the reading; the user selects among cards no one has seen, and neither the user nor a model sets what a card is.
- ADR-0014: the interpretation uses the normal reply path, so a hosted reply sees the dealt reading as it does today and never an unrevealed card.
- ADR-0015: calls keep immediate readings.
- ADR-0017: Proposed in this change and accepted when it is archived.
