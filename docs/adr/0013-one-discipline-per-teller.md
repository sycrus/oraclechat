# ADR-0013: One discipline per teller, with an app-owned reading method

**Status:** Accepted
**Date:** 2026-11-19
**Supersedes:** None (records the discipline scope that #8 asked for; extends ADR-0001 and ADR-0007)

## Context

The PRD's first release had tarot tellers only, and #8 asked which other divination disciplines Oracle supports, whether a conversation can mix them, and how a teller declares its discipline. Since then, the I Ching casting shipped and ADR-0012 gave each teller its own speciality: Mira reads tarot and Sage reads the I Ching. The owner wants more tellers, each with its own skill, and has astrology in mind for a later one. This ADR records the rules every discipline follows, so new tellers don't need to reopen them.

## Decision

- **One discipline per teller.** Each teller definition declares exactly one `discipline` and a `readingLens` (how it reads in that discipline). A teller always reads in its own discipline, whatever the user calls the reading.
- **Disciplines in scope today:** tarot (Mira) and the I Ching (Sage). A conversation may mix disciplines: in a group chat each teller reads in its own, and the others may react to it (ADR-0012).
- **Signature cards are tarot-only.** Tarot tellers declare a signature card position; other disciplines must not.
- **Adding a discipline needs, in one OpenSpec change:**
  - an application-owned reading method (a draw, a casting or a calculation done by the app, never by the model) whose result the teller interprets but cannot change;
  - original catalog content with recorded provenance, separating traditional names from Oracle's own text;
  - validated rendering in the chat, with prose as the fallback for invalid data;
  - a teller definition and activation profile, and routing cases showing the new teller is asked for readings correctly;
  - the discipline added to the set `ChatService` accepts for conversations.
- **No model-chosen results.** Models never pick cards, lines, chart positions or other reading data, and never fetch them from the web as a substitute for the app's own method.
- **Later candidates.** Astrology is the expected next discipline. How it works (inputs such as birth details, how they are stored and consented to, and how charts are computed) is decided in its own change and ADR.

## Consequences

- New disciplines are added one teller at a time, each with its own reading method, content and renderer. That keeps readings reproducible and owned by the app, at the cost of more work per discipline.
- The discipline enum in the teller schema lists future candidates (astrology, rune casting, numerology and others), but a teller with one of them cannot join a conversation until its change lands.
- Mixing disciplines in a group chat means the tellers' readings differ in kind. Each reading is stored with its own teller's reply and labelled when others refer to it.

## Validation

- Teller schema tests reject a definition without a `readingLens`, a tarot teller without a signature card, and a non-tarot teller with one.
- `ChatService` tests show that a teller reads only in its own discipline and that conversations reject tellers whose discipline has no reading method.
- Each new discipline's change adds tests for its reading method, catalog provenance, rendering fallback and routing cases.
