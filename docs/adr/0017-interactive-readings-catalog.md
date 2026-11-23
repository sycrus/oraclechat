# ADR-0017: Interactive readings are an app-owned catalog of message kinds

**Status:** Accepted
**Date:** 2026-11-20
**Supersedes:** None (extends ADR-0012 and ADR-0013; keeps ADR-0006's retirement of the old generative UI)

## Context

Oracle's tellers answer in text, and the app renders their readings as fixed components: tarot spreads, an I Ching casting, link cards. The owner wants the user to interact with each teller differently, in ways that belong to that teller's world rather than the plain bubbles of a messaging app: a fan of face-down cards to pick from, coins to toss, a chart to tap into. What the user does should flow back to the teller.

Projects such as A2UI and json-render let a model describe a UI as JSON that a client renders from a catalog of trusted components. Oracle's constraints point to a narrower version of that idea:

- The local model must not choose reading results (ADR-0013), and tool calling on it is unreliable, so tools stay app-owned (ADR-0002, ADR-0003, ADR-0012).
- The old generative-UI package was retired (ADR-0006), and the current spec requires that teller prose cannot generate UI instructions.
- Reading data is validated before it renders, with the teller's prose as the fallback.
- Calls (ADR-0015) already reuse the parsed tarot data in their own overlay.

## Decision

- **A closed catalog of message kinds, owned by the app.** An interactive kind has a name, a typed payload validated before it renders, a fixed list of interactions, an app-written renderer and a prose fallback. Adding a kind needs an OpenSpec change.
- **Models never emit UI.** No model output is ever a component tree, a kind, a payload or an interaction. The kind comes from app code: the teller's declared discipline and interactions in its definition, and the turn router's existing `reading` decision (ADR-0012). If a later change lets a model choose a kind, it may choose only a kind name from an enum in constrained JSON output, as routing does today, never a payload, and the app validates it.
- **Results stay app-owned.** An interaction may select among items the app has already randomized and hidden. It never lets the user or the model choose what an item is (ADR-0013). Hidden items stay on the server: they are not sent to the browser or to any teller until revealed.
- **Interactions are structured events.** An interaction is a typed request to the backend that names the message and the action. The app validates it against the message's saved state, applies it idempotently, and rejects anything that doesn't fit. The interaction state is saved with the message, so a reload resumes where the user left off.
- **Interactions are not chat.** They are not user messages and not material for memory extraction (ADR-0009). A teller learns of them only through their effect: the revealed result it then interprets.
- **Fallback.** An unknown kind, an invalid payload or a failed interaction leaves the teller's prose and the previous state on screen.
- **Calls stay separate.** The call overlay keeps its own presentation unless a change says otherwise.
- **Observability.** Spans record the kind, the teller and interaction counts, never content (ADR-0004).
- **First kind.** The tarot card fan for Mira, in the OpenSpec change `tarot-card-fan`.

## Consequences

- Each teller can have its own way of interacting. The cost is a typed payload, a renderer, saved state and tests per kind.
- Safer and more reproducible than model-authored UI, and less flexible: tellers cannot invent layouts. A later change that wants model-composed layouts must supersede this ADR.
- For kinds with hidden state, a reading is no longer always drawn just before the teller replies: the app still draws, but the reveal can follow the user's interaction. The teller interprets after the reveal.
- The backend stores hidden state and gains an interaction endpoint, which is one more surface to keep correct.

## Validation

- Tests show that unknown kinds and invalid payloads render as prose, and that teller text cannot create or alter a kind.
- Tests show that hidden identities are absent from every browser payload and teller input until revealed.
- Tests show that interactions are idempotent, rejected when out of state, saved across reloads, and never reach memory extraction.
- Each new kind's change adds scenarios against these rules. `pnpm adr:check` passes.
