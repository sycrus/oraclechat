# Proposal

## Intent

Give Sage the interactive reading his discipline calls for: when asked for a reading in chat, he offers the coins, the user performs six throws that visibly build the hexagram line by line, and Sage interprets only the completed cast.

## Why

ADR-0017's catalog exists for exactly this — its context names "coins to toss" as the motivating interaction, and only Mira's card fan (the first kind) is built. Today Sage's castings appear instantly, which skips the one thing that makes an I Ching consultation what it is: the querent casts their own coins, and the diviner reads only a finished hexagram (`docs/iching/consultation-flow.md`). The infrastructure — hidden server state, typed interactions, idempotency, prose fallback — is tested and waiting from the card fan.

## What Changes

- New interactive kind `coin-toss`: the app pre-casts six throws server-side; each user toss reveals the next line, bottom to top, with its coin faces; the sixth toss completes the hexagram, saves the reading (lines, primary, relating per the existing rules) on the message, and Sage then interprets it in a separate streamed reply.
- New teller-definition field `toss` (invitation text), allowed only for I Ching tellers, mirroring the tarot `fan` field; Sage's definition enables it.
- The interaction API gains the `toss` action (with an `after` guard so an out-of-date or repeated toss never advances the cast).
- The iching and interactive-readings specs' "casts at once" scenarios become qualified: immediate casting remains for calls and for I Ching tellers without the toss.
- Frontend `CoinToss` component: six line slots bottom-up (solid/broken, changing lines marked), a labelled toss control with coin faces, accessible line count, reduced-motion support.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `interactive-readings`: the closed catalog gains its second kind. The fan-per-teller requirement's scenarios stop asserting that Sage casts at once; new requirements define the toss's layout, hidden throws, tossing, completion, interpretation, and accessibility.
- `iching`: the app-owned casting requirement stops being unconditional for chat — a toss-enabled teller's chat reading is the interactive cast; calls and toss-less tellers keep the immediate casting.

## Impact

- Backend: new `backend/agent/src/iching/toss.ts`; `chat/interaction.ts` (interaction union + toss action), `chat/service.ts` (layOutToss, toss in applyInteraction, dealt type widening), `tellers/schema.ts` (toss field), `tellers/definitions/sage.yaml`.
- Frontend: `lib/toss.ts`, `app/CoinToss.tsx`, `chat-workspace.tsx` wiring, CSS.
- Reused unchanged: `iching/cast.ts` math (hexagramFor, relating hexagram), the store's compare-and-set interactions, `replyAs` dealt flow, IChingView rendering, the interactions endpoint.
- Docs: `docs/iching/consultation-flow.md` records the practice this mirrors (already written).

## Non-goals

- No yarrow-stalk method; three coins only.
- No change to calls: Sage's call readings stay immediate ("see chat" note), per ADR-0017's "calls stay separate".
- No model-chosen kinds, no new disciplines, no change to Mira's fan.

ADRs reviewed: ADR-0017, ADR-0013, ADR-0012, ADR-0002, ADR-0004
