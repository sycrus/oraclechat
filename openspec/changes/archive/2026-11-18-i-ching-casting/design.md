## Context

- Tarot draws live in `backend/agent/src/tarot/`; `ChatService` draws, persists the draw as the user message's `reading`, emits a `tarot_spread` event and gives it to each teller.
- `reading` is JSONB, so a differently shaped reading needs no schema change.
- The frontend parses `reading` with `parseTarotSpread` and renders cards; unknown shapes are omitted.

## Decision

- **Casting module** `backend/agent/src/iching/`:
  - `cast.ts` casts six lines: three coin flips each (heads 3, tails 2), values 6, 7, 8 or 9, bottom to top. It takes an injectable random source like `drawSpread`.
  - A line is *yang* when 7 or 9 and *changing* when 6 or 9. The primary hexagram uses the lines as cast; the relating hexagram flips every changing line and exists only when at least one line changes.
  - `hexagrams.ts` holds the 64 entries `{ number, name, meaning }` and the King Wen lookup from (lower trigram, upper trigram).
- **Reading shape:** `{ method: "i-ching", lines: [{ value, yang, changing }] x6, primary: { number, name, meaning }, relating?: { number, name, meaning } }`. Tarot readings are unchanged and have no `method`.
- **ChatService:** the spread choice becomes `TarotSpreadType | "i-ching" | "none"`. For `i-ching` it casts, persists, emits the reading as an event, and gives each teller `Application-owned I Ching casting (interpret it without changing it): <JSON>` plus a note to name the hexagram, mention any changing lines and keep the reply short. No signature cards. The conversation-turn reference line (most recent reading) already works with any JSON reading.
- **API:** `spread` accepts `"i-ching"`.
- **Frontend:** `lib/iching.ts` validates the reading (six lines, values 6-9, consistent `yang` and `changing`, hexagram numbers 1-64, relating present only with a changing line). `IChingView` draws each line as solid or broken, with a marker on changing lines. The composer option is added to `SPREAD_OPTIONS`.
- **Tracing:** `oracle.turn.spread` takes `"i-ching"`; no content is traced.
- **Provenance:** `ichingContentProvenance` records that the meanings are original, written for this project, and that hexagram names and the King Wen sequence are traditional.

Rejected:
- **Reusing the tarot spread shape.** A hexagram is not a list of named cards; forcing it into one would weaken validation.
- **A new I Ching teller.** It needs a persona and is a separate product decision.

## Verification

Test-first:
- Cast: six lines bottom to top with values in 6-9; line values follow the coin sums; changing lines yield a relating hexagram and stable casts do not; known lookups (all yang is 1, all yin is 2, lower Kun with upper Qian is 12, lower Li with upper Kan is 63); the catalog has 64 unique numbers and non-empty names and meanings.
- ChatService: an `i-ching` turn persists one reading, emits it, gives both tellers the same casting and no signature card.
- API: `i-ching` is accepted.
- Frontend: parser accepts a valid reading and rejects wrong line count, bad values, inconsistent flags and a relating hexagram without changing lines; the composer offers *I Ching casting*.

Then a live casting with both tellers.

## ADR alignment

- ADR-0002 and ADR-0003: the casting is app-owned and user-initiated, runs locally, and tellers only interpret it.
- ADR-0004: `oracle.turn.spread` gains a value; no casting content is traced.
- ADR-0008: both tellers still respond.
- ADR-0001 and ADR-0007: single-user scope is unchanged. The PRD's "non-tarot tellers" exclusion is untouched because no new teller is added; its "Other disciplines are later scope" line is updated.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
