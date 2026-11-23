# ADR-0020: Interactive readings and the birth-details form in calls

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** ADR-0018 "Calls never show the form" clause; ADR-0017 "Calls stay separate" bullet for interactive kinds

## Context

ADR-0017 made interactive readings (Mira's card fan, Sage's coin toss) chat-only, and said the call overlay keeps its own presentation unless a change says otherwise. ADR-0018 added Astra's birth-details form and said outright that calls never show it. In practice, a call turn asking for a reading skips the interaction: Mira's spread is dealt at once, Sage's casting is cast at once, and Astra without birth details can only say "add them in the chat after the call". Only tarot cards appear in the call. The I Ching and chart readings show a "see chat" note.

The owner wants the same interactions in a call. The call already has a typed-message panel above its input bar (ADR-0019 call layout), and the chat's interactive cards are self-contained components.

## Decision

- **Calls lay out interactive readings.** A reading asked for in a call turn follows the same rules as the chat: a fan-enabled tarot teller lays out the fan, a toss-enabled I Ching teller lays out the coin toss, and an astrology teller with no saved birth details lays out the birth-details form. The teller speaks its fixed invitation as the call reply; no model call writes it.
- **Same interaction rules.** Picks, reveals, tosses and submissions are the same typed interactions (ADR-0017), validated and stored the same way. They are never user messages. The birth-details submission keeps ADR-0018's consent, storage and privacy rules unchanged: the details are saved only with explicit consent, never become memory, and never go into spans or messages.
- **Spoken interpretation.** An interaction sent from a call carries a call flag. Only a one-to-one conversation with a callable teller accepts it. The interpretation that follows a reveal, the sixth toss or a submission is then a call reply: plain spoken sentences with expression tags (ADR-0015), saved to the conversation like any reply.
- **Shown in the call's message panel.** The interactive card appears in the call's typed-message panel, above the input, and the panel opens by itself when one arrives. After the reveal the panel keeps a compact result: the tarot spread, the hexagram card, or the chart summary. Their full views open as sheets above the call.

## Consequences

- The call and the chat show the same reading. A reading started in a call can be finished in the chat, and the other way round, because the interaction lives on the saved message.
- The "see chat" note remains only for reading data the call can't show.
- Entering birth details in a call means typing in a form during the call. The form opens as a full-screen sheet over the call, which keeps running underneath.
- Specs that said "every call turn keeps immediate readings" change: interactive-readings, iching, voice-calls and the astrology call requirement.

## Validation

- Backend tests: a call turn asking Mira, Sage or Astra (without details) for a reading lays out the fan, toss or form and emits the invitation as a spoken sentence. An interaction with the call flag on a group conversation is rejected. A reveal with the call flag streams spoken sentences with no tags in the saved text.
- Frontend tests: the call panel renders the interactive card and the compact results, and opens when an interaction arrives.
- The birth-details tests from ADR-0018 still pass unchanged.
