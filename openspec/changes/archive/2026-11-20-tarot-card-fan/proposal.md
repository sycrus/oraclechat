## Intent

Let the user pick Mira's cards from a fan of face-down cards instead of receiving a ready-made spread: the first interactive message kind in ADR-0017's app-owned catalog.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0006, ADR-0008, ADR-0009, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0017

## Why

A reading arrives instantly as a finished spread, so the user only watches. With a friend who reads tarot, you choose the cards. A fan gives Mira a way of interacting that belongs to her world and sends what the user did back to her. It is also the smallest case that exercises everything ADR-0017 asks for: hidden state, validated interaction events and a reading that resumes after a reload.

## What Changes

- **The fan.** When Mira is asked for a reading in chat, she lays out a fan of face-down cards with a short invitation written in her teller definition (no model call). The user picks as many cards as the spread has positions, can change their picks, then reveals.
- **Hidden until reveal.** The app decides every fan card's identity and orientation when it lays out the fan and keeps them on the server. They never reach the browser or a teller before the reveal, and unpicked cards are never shown.
- **Deal and interpretation.** Revealing deals the picked cards into the spread's fixed positions in the order picked, draws Mira's action card, and saves the reading with the fan message. Mira then interprets it as a separate streamed reply.
- **Resumable.** Picks and state are saved, so a reload resumes the fan.
- **Fallbacks.** Invalid fan data renders as prose; a failed interaction leaves the previous state.
- **Unchanged.** Sage's I Ching casting and readings in calls stay immediate.
- **ADR-0017** is accepted when this change is archived.

## Capabilities

### New Capabilities
- `interactive-readings`: the closed catalog of interactive message kinds, hidden state, validated interaction events, and the tarot card fan with its pick, reveal and interpretation flow.

### Modified Capabilities
- `chat`: the signature card and the reading belong to the reveal, not to the start of the reply, for a fan reading.

## Non-goals

- Fans for other tellers or other message kinds (Sage's coin toss, an astrology chart): later changes, each needing their own scenarios.
- Fans in calls, or the call overlay picking cards.
- A model choosing, describing or shaping a kind or payload.
- Letting the user choose which cards exist: picking selects among cards the app already shuffled.
- Memory from interactions.

## Impact

- Backend: an interaction route and a reveal flow in `ChatService`, factored from the existing teller reply step; a fan deal beside `tarot/draw.ts`; message storage for interaction state with server-only hidden data (`chat/store.ts`, `chat/types.ts`); a teller definition field and its schema check; Mira's definition.
- Frontend: a fan component and its validation in `lib/`, rendered in `chat-workspace.tsx`.
- Docs: `docs/adr/0017-interactive-readings-catalog.md` (Proposed), its index line, and `docs/operations.md` only if setup changes.
