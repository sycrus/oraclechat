# Add app-owned tarot readings

Implement the approved MVP tarot flow: fixed one-card or three-card app-owned draws, streamed teller interpretation, persistent spread data, and inline placeholder cards.

## Why

The agreed product keeps card selection and spread positions in application code so model prose cannot change the reading result. Three cards are the default; one card is available by user choice.

## Scope

- Draw distinct cards, assign orientation, and apply fixed spread positions.
- Persist the draw with the triggering user message and provide the same draw to each responding teller.
- Render inline placeholder cards with position, orientation, and expandable placeholder meaning.

## Non-goals

- Original tarot interpretations, card art, Celtic Cross, or other divination systems.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007
