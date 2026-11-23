## Purpose

Defines the MVP's inline tarot cards. The application owns the draw and validates spread data before rendering; teller prose cannot generate UI instructions. Original Oracle pixel-art card faces and orientation-specific interpretations are used.

---

### Requirement: Tarot spread validation

The frontend SHALL accept only `one-card` spreads with exactly one guidance card, `three-card` spreads with exactly past, present, and future cards in order, or `celtic-cross` spreads with exactly the ten Celtic Cross positions in their fixed order. Every card SHALL have a unique name, supported orientation, image reference, and meaning. Invalid spread data SHALL be rejected and omitted from rendering.

#### Scenario: Valid app-owned spread renders

- GIVEN a valid one-card, three-card or Celtic Cross spread
- WHEN chat renders the message
- THEN the corresponding number of cards is shown with its position and orientation
- AND a Celtic Cross uses the traditional cross-and-staff layout

#### Scenario: Invalid spread falls back to prose

- GIVEN spread data has a missing card, unsupported variant, wrong position, duplicate card, or invalid orientation
- WHEN the chat validates the data
- THEN the spread is omitted
- AND the teller's prose remains visible

### Requirement: Inline tarot card interaction

The chat SHALL render original illustrated cards inline. Selecting a card SHALL reveal its orientation-specific interpretation. Reversed orientation SHALL rotate the illustration, remain legible in the label, and be included in the card's accessible name.

#### Scenario: Reveal the card interpretation

- GIVEN an inline tarot card
- WHEN the user selects it
- THEN the original interpretation is revealed
- AND selecting it again hides the text

#### Scenario: Reversed orientation is accessible

- GIVEN a card is reversed
- WHEN the card is rendered
- THEN it is visually marked as reversed
- AND assistive technology can determine that orientation

## Deferred visual enhancements

- Casting skeleton and flip animations
- Further visual refinement beyond the current responsive card presentation
- Visual components for other divination disciplines
