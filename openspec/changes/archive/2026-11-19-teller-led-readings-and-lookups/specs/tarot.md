## MODIFIED Requirements

### Requirement: Fixed app-owned spreads

The application SHALL draw tarot cards only for a tarot teller's reading (see the chat spec). It SHALL support one-card, three-card and Celtic Cross spreads, draw distinct cards from a 78-card deck, assign upright or reversed orientation, and keep the positions fixed by spread type. A one-card spread uses `guidance`; a three-card spread uses `past`, `present`, and `future`; a Celtic Cross uses, in order, `heart`, `challenge`, `foundation`, `recent-past`, `conscious`, `near-future`, `self`, `environment`, `hopes-fears`, and `outcome`. The spread SHALL be the one in the teller's route, `three-card` when the route gives none. The draw SHALL be supplied to that teller, persisted with its reply, and remain immutable during interpretation.

#### Scenario: No reading requested
- **WHEN** no tarot teller's route calls for a reading
- **THEN** no cards are drawn and no spread is shown

#### Scenario: Three cards
- **WHEN** a tarot teller's reading uses the three-card spread
- **THEN** exactly three distinct cards are drawn in past, present and future order
- **AND** each orientation is upright or reversed

#### Scenario: One card
- **WHEN** a tarot teller's reading uses the one-card spread
- **THEN** exactly one distinct card is drawn in the guidance position

#### Scenario: Celtic Cross
- **WHEN** a tarot teller's reading uses the Celtic Cross spread
- **THEN** exactly ten distinct cards are drawn in the fixed Celtic Cross position order
- **AND** each orientation is upright or reversed

#### Scenario: Teller interprets an immutable draw
- **WHEN** a tarot teller responds with a reading
- **THEN** it receives the application-owned spread
- **AND** it cannot add, remove, or change drawn cards or positions

#### Scenario: Reading persists with the conversation
- **WHEN** a conversation with a drawn spread is reopened
- **THEN** the original spread, card names, positions, and orientations are available for rendering with the teller's reply

### Requirement: Teller signature cards

When a tarot teller gives a reading, it SHALL receive one additional application-drawn signature card in its defined position (`action` for Mira). The signature card SHALL be distinct from that spread (including all ten cards of a Celtic Cross), SHALL carry an orientation and the orientation-specific meaning, SHALL be persisted with that teller's reply, and SHALL be immutable during interpretation. Replies without a tarot reading, and replies by non-tarot tellers, SHALL have no signature card.

#### Scenario: Mira draws her action card
- **WHEN** Mira gives a three-card reading
- **THEN** Mira receives an action card that does not appear in her spread

#### Scenario: Signature card beside a Celtic Cross
- **WHEN** Mira gives a Celtic Cross reading
- **THEN** her signature card does not appear among the ten spread cards

#### Scenario: No signature card without a tarot reading
- **WHEN** a teller replies without a tarot reading, or Sage gives an I Ching casting
- **THEN** that reply has no signature card
