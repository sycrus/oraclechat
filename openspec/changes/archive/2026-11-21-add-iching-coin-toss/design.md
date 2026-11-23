# Design

## Reuse vs. new

Almost everything is reused from the card fan (ADR-0017's first kind):

- `backend/agent/src/iching/cast.ts` — the casting math (`hexagramFor`, relating-hexagram derivation, `hexagrams` catalog). The toss only changes *when* the six line values are revealed, never how the reading is formed. New module `iching/toss.ts` holds the interaction state; the reading is formed by calling the same helpers.
- `backend/agent/src/chat/interaction.ts` — the hidden-state stripping, error types and request validation grow a `coin-toss` member and a `toss` action.
- `backend/agent/src/chat/service.ts` — `applyInteraction` gains the toss branch; a new `layOutToss` mirrors `layOutFan` (including the set-aside sweep, which is already kind-agnostic in its message iteration); `replyAs`'s `dealt` parameter widens to accept an `IChingReading`.
- `backend/agent/src/server/app.ts` — the interactions endpoint is kind-agnostic; unchanged.
- Frontend: `lib/fan.ts`/`card-fan.tsx` are the pattern for new `lib/toss.ts`/`CoinToss.tsx`; `chat-workspace.tsx` parses and renders it beside the fan; revealed casts render through the existing `IChingView`.

## Server state (`iching/toss.ts`)

```ts
export interface TossInteraction {
  kind: "coin-toss"
  state: "casting" | "revealed" | "set-aside"
  /** Lines tossed so far, bottom to top. */
  lines: IChingLine[]
  /** Pre-cast values (6-9) not yet tossed; stripped from every public payload. */
  remaining?: number[]
}
export type PublicToss = Omit<TossInteraction, "remaining">
```

- `drawToss()` casts six values with the three-coin distribution already in `castIChing` (same `random()` seam for tests) and returns `{ kind: "coin-toss", state: "casting", lines: [], remaining: [...] }`.
- `completeToss(lines)` builds the `IChingReading` from the six lines (primary, relating when any line changes) — the same rules as `castIChing`, factored so both share it.
- `publicInteraction` in `chat/interaction.ts` strips `remaining`; the browser sees `{ kind, state, lines }` — a line's coin faces are derived in the frontend from its value (9→●●●, 8→●●○, 7→●○○, 6→○○○, ● = yang-facing 3, ○ = 2; each value maps to exactly one combination, so nothing extra is sent).
- The `Interaction` union becomes `FanInteraction | TossInteraction`; `InteractionRequest` gains `{ action: "toss"; after: number }` where `after` is the tosser's view of the lines tossed.

## Service flow

- `runTurn`: for a chat reading turn, `teller.fan` lays out the fan (unchanged); `teller.toss` lays out the toss; otherwise `replyAs` as today. Only one applies per teller (one discipline each, ADR-0013).
- `applyInteraction`, toss branch: message must hold a `coin-toss` interaction in `casting`; reject 409 when `parsed.after !== toss.lines.length`; reject 400 when nothing remains. Otherwise shift `remaining[0]` into `lines`, compare-and-set via the store, return the public message. When `lines.length` reaches six: form the reading with `completeToss`, CAS `casting → revealed` (remaining discarded), emit `message_update` with the saved reading, then `replyAs({ dealt: { reading } })` so Sage interprets in a separate streamed reply.
- `replyAs`'s `dealt` widens to `{ reading: TarotSpread | IChingReading; card?: TarotCardDraw }`. `readingContext`'s I Ching branch gains, when `picked` (a revealed toss), a line telling the teller the user cast these coins themselves, one throw per line, bottom to top.
- `layOutToss` mirrors `layOutFan`: sweep earlier open interactions for this teller to `set-aside` (existing loop handles both kinds; it is extracted so both paths share it), `drawToss()`, emit `message_start`/invitation chunk/`message_complete`, save with the interaction. Span attribute `oracle.teller.reading: "iching-toss"`; the interaction span records kind `coin-toss` and action `toss`.

## Teller definition

`schema.ts` gains `toss: z.object({ invitation: z.string().min(1) }).optional()` with a `superRefine` rule: an I Ching teller only (mirroring the fan's tarot-only rule). `sage.yaml` enables it with an invitation in Sage's voice: settle the question, toss three coins six times, bottom line first.

## Frontend

- `lib/toss.ts`: `parseTossInteraction` (validates kind, states, six-or-fewer well-formed lines) + `coinFaces(value)` + `lineLabel(value, place)`; mirrors `lib/fan.ts`.
- `app/CoinToss.tsx`: renders the six line slots bottom-up — tossed lines as solid (yang) or broken (yin) bars, changing lines marked, pending slots as empty; a "Toss the coins (4 of 6 tossed)" control with the three coin glyphs, disabled while busy or complete; `prefers-reduced-motion` honoured by the CSS animation; `aria-live` count and per-line labels.
- `chat-workspace.tsx`: parse `parseTossInteraction(message.interaction)` and render `<CoinToss onToss={(after) => void interact(message.id, { action: "toss", after })} />`; revealed messages fall through to the existing `IChingView` via the saved reading, as the fan falls through to the spread view.

## TDD approach

Failing tests first, then the minimum implementation, per task in tasks.md:

- `backend/agent/tests/iching/toss.test.ts` — drawToss hides values and casts six; completeToss matches `castIChing` rules for the same lines (primary, relating, none without changing lines); invalid complete calls rejected.
- `backend/agent/tests/tellers/schema.test.ts` — a toss on a tarot teller is rejected; a toss without invitation is rejected; Sage's definition validates with its toss.
- `backend/agent/tests/chat/` toss-turn test — a toss-enabled teller asked for a reading lays out the interaction (invitation saved, no lines in the public payload, earlier open toss set aside), and an immediate-cast teller still casts.
- `backend/agent/tests/chat/` interaction test — toss sequence reveals lines bottom-up; `after` guard rejects out-of-date and repeats idempotently; sixth toss reveals, saves the reading, and streams Sage's interpretation (stream stub asserts the input contains the exact cast and the user-cast note); failure after the sixth toss keeps the cast revealed; tosses never become user messages or memory input.

Then the frontend: `lib/toss.test.ts` for parsing and coin faces, and a `CoinToss` render test in the static-markup style of `card-fan.test.tsx`. Wire-in test follows the existing chat-workspace coverage.

## Risks

- **Double-toss races:** guarded by the `after` count plus the store's compare-and-set; a stale request is rejected rather than advancing.
- **Fan sweep touching tosses:** the set-aside loop is kind-agnostic; extracting it must preserve fan behaviour — existing fan tests cover it.
- **Payload leaks:** the browser payload strips `remaining` in one place (`publicInteraction`); tests assert no 6–9 values beyond tossed lines appear anywhere.

## ADR alignment

ADRs reviewed: ADR-0017, ADR-0013, ADR-0012, ADR-0002, ADR-0004

- **ADR-0017:** this change *is* the ADR's second kind, added through its required OpenSpec process. Results stay app-owned (pre-cast throws; a toss only reveals), hidden state stays on the server, interactions are typed idempotent events outside chat and memory, unknown/invalid payloads fall back to prose, calls stay separate, spans record kind and action without content.
- **ADR-0013:** the app still owns the randomness — the user's toss selects among throws the app already decided, never choosing values.
- **ADR-0012:** the reading still comes from the router's decision; the toss changes only when the reveal happens.
- **ADR-0002:** no model involvement in the cast or the UI; the invitation is app-written.
- **ADR-0004:** interaction spans extend the existing pattern; no values in spans.

No durable architecture decision changes, so no new ADR is proposed.
