# Proposal

Bring the interactive readings into video calls. When Mira, Sage or Astra is asked for a reading during a call, the call shows the same card fan, coin toss or birth-details form as the chat. It appears in the call's message panel, above the input bar. After the reveal the panel keeps a compact result, and the teller speaks the interpretation.

ADRs reviewed: ADR-0002, ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0020

## Why

In a call today, the interactions are skipped. Mira's cards are dealt for you, Sage casts the coins himself, and Astra without saved birth details can only say "add them in the chat after the call". Only tarot cards appear in the call. The I Ching and chart readings show "see chat". The owner wants to pick the cards, toss the coins and enter birth details in a call, as in the chat.

## What Changes

- A reading asked for in a call turn lays out the fan, coin toss or birth-details form, as in the chat. The teller speaks its fixed invitation.
- Interactions accept a `call` flag. With it, the interpretation after a reveal, the sixth toss or a birth-details submission is a spoken call reply. Only a one-to-one conversation with a callable teller accepts the flag.
- The call's message panel shows the interactive card above the input and opens by itself when one arrives. After the reveal it shows a compact result: the tarot spread, the I Ching card or the chart summary. Sheets (line by line, full chart, birth form) open above the call.
- The tarot cards move from the strip over the teller's face into the panel, which also fixes the fourth card being cut off at phone width.
- **BREAKING (spec):** "every call turn keeps immediate readings" is removed from interactive-readings and iching, and the astrology call requirement changes. ADR-0020 supersedes ADR-0018's "calls never show the form".

## Capabilities

### Modified Capabilities
- `voice-calls`: readings during a call, the interactive card in the call panel, and the astrology call requirement.
- `interactive-readings`: call turns lay out the fan and toss; interpretation in a call is spoken.
- `iching`: call turns use the coin toss when it is enabled.

## Impact

- Backend: `chat/service.ts` (call turns lay out interactions; the call flag on interactions), `chat/interaction.ts` (parse `call`), `server/app.ts` (validate `call` on interactions).
- Frontend: `call/call-overlay.tsx`, `call/call-overlay-view.tsx`, `lib/call/reading.ts`, `globals.css` (panel, sheet layer above the call).
- Depends on `add-astrology-teller` and `adopt-pixel-chat-ui`, both unarchived: this change modifies their astrology call requirement and call layout.
