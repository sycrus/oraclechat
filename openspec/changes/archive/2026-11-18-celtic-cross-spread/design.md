## Context

- `drawSpread` in `backend/agent/src/tarot/draw.ts` maps `one-card`/`three-card` to a fixed position list and draws that many cards.
- The API route in `server/app.ts` validates `spread`; `ChatService` passes it to `drawSpread`.
- The frontend parser `lib/tarot.ts` hard-codes the two spread types and their positions; `chat-workspace.tsx` renders them in a flex row, and the composer `<select>` lists the options.
- Spreads are persisted as JSON on the user message, so a new spread type needs no schema change.

## Decision

- **Positions.** One table, `SPREAD_POSITIONS`, maps each spread type to its ordered positions. `drawSpread` reads it; the existing spreads keep their positions. The `TarotCardDraw["position"]` union gains the ten Celtic Cross keys.
- **Draw.** Unchanged algorithm: shuffle the deck, take the first N, assign orientation. Signature cards are drawn from the remainder.
- **API.** The route accepts `celtic-cross`; the error message lists all valid values.
- **Frontend parser.** `parseTarotSpread` uses a matching table of expected positions per spread, so validation (count, order, unique names and art) is data-driven. The frontend keeps its own copy because the two packages share no code.
- **UI.** The Cards menu gains *Celtic Cross*. The spread container keeps the `tarot-spread celtic-cross` class; CSS lays the ten cards on a grid (cross in columns 1-3, staff in column 4) at desktop width, and as a wrapping grid on narrow screens. Position labels replace hyphens with spaces.
- **Teller prompt.** The teller input already carries the draw JSON. For `celtic-cross` it appends one line asking for a concise reply that names the cards that matter most rather than every position.
- **Tracing.** `oracle.turn.spread` takes the new value; no other span change.

Rejected:
- **Model-chosen position names.** Positions stay fixed and app-owned.
- **A shared package for spread definitions.** Too much structure for one table duplicated across two packages.

## Verification

Test-first:
- Draw: ten distinct cards, positions in order, upright or reversed; signature cards are distinct from all ten.
- ChatService: a `celtic-cross` turn emits one ten-card `tarot_spread`, persists it, and gives both tellers the same draw and the concise-reply line.
- API: `celtic-cross` is accepted and an unknown value is a 400.
- Frontend parser: accepts a valid ten-card spread; rejects a wrong count, a wrong position, a duplicate card and an unknown spread type.
- UI: the composer offers *Celtic Cross*.

Then a live Celtic Cross turn with both tellers.

## ADR alignment

- ADR-0002 and ADR-0003: the draw is application-owned and user-initiated; tellers only interpret it.
- ADR-0004: `oracle.turn.spread` gains a value; spans carry no card content.
- ADR-0008: both tellers still respond on every turn.
- ADR-0001 and ADR-0007: single-user scope is unchanged. The PRD's "Celtic Cross ... later scope" line is updated.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
