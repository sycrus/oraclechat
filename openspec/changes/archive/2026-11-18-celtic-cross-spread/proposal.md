## Intent

Let the user choose a Celtic Cross, the classic ten-card spread, for a message, alongside the one-card and three-card spreads.

## Why now

Milestones 0-5 are complete, and Celtic Cross is the first item deferred in milestone 5. It reuses the existing app-owned draw, persistence and rendering path, so it needs no new infrastructure.

## What changes

- **New spread `celtic-cross`** with ten fixed positions, in order: `heart`, `challenge`, `foundation`, `recent-past`, `conscious`, `near-future`, `self`, `environment`, `hopes-fears`, `outcome`.
- The composer's Cards menu gains **Celtic Cross**. The API accepts `spread: "celtic-cross"`.
- The ten cards are distinct and drawn from the 78-card deck. Each teller's signature card is distinct from all ten and from the other teller's (68 cards remain, so there are always enough).
- The frontend validates the ten positions in order and renders the spread in the traditional cross-and-staff layout on desktop, wrapping to a grid on narrow screens.
- Tellers receive the same immutable draw as for other spreads. For a Celtic Cross they are also asked to keep each reply concise and focused on the cards that matter most.

## Non-goals

- Other spreads, additional disciplines, or user-defined spreads.
- Letting tellers choose or alter a draw (ADR-0002, ADR-0003).
- Changing how one-card and three-card spreads work.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
