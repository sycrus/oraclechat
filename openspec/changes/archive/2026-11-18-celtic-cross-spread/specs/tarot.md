## MODIFIED Requirements

### Requirement: Fixed app-owned spreads

The application SHALL draw tarot cards only when the user chooses a spread for a message. It SHALL support one-card, three-card and Celtic Cross spreads, draw distinct cards from a 78-card deck, assign upright or reversed orientation, and keep the positions fixed by spread type. A one-card spread uses `guidance`; a three-card spread uses `past`, `present`, and `future`; a Celtic Cross uses, in order, `heart`, `challenge`, `foundation`, `recent-past`, `conscious`, `near-future`, `self`, `environment`, `hopes-fears`, and `outcome`. A message sent without a chosen spread SHALL have no draw. When there is a draw, the same draw SHALL be supplied to every teller responding to that message, persisted with that user message, and remain immutable during interpretation.

#### Scenario: Message without a chosen spread
- **WHEN** a user sends a message without choosing a spread
- **THEN** no cards are drawn and no spread is shown

#### Scenario: User chooses three cards
- **WHEN** a user chooses the three-card spread
- **THEN** exactly three distinct cards are drawn in past, present and future order
- **AND** each orientation is upright or reversed

#### Scenario: User chooses one-card
- **WHEN** a user chooses the one-card spread
- **THEN** exactly one distinct card is drawn in the guidance position

#### Scenario: User chooses Celtic Cross
- **WHEN** a user chooses the Celtic Cross spread
- **THEN** exactly ten distinct cards are drawn in the fixed Celtic Cross position order
- **AND** each orientation is upright or reversed

#### Scenario: Tellers interpret an immutable draw
- **WHEN** one or more tellers respond to a message with a draw
- **THEN** each receives the same application-owned spread
- **AND** the teller cannot add, remove, or change drawn cards or positions

#### Scenario: Reading persists with the conversation
- **WHEN** a conversation with a drawn spread is reopened
- **THEN** the original spread, card names, positions, and orientations are available for rendering

### Requirement: Teller signature cards

On a message with a draw, each responding teller SHALL receive one additional application-drawn signature card in its defined position (`action` for Mira, `shadow` for Sage). Signature cards SHALL be distinct from the shared spread (including all ten cards of a Celtic Cross) and from each other within a turn, SHALL carry an orientation and the orientation-specific meaning, SHALL be persisted with that teller's reply, and SHALL be immutable during interpretation. Messages without a draw SHALL have no signature cards.

#### Scenario: Each teller draws its own card
- **WHEN** Mira and Sage both respond to a three-card reading
- **THEN** Mira receives an action card and Sage receives a shadow card
- **AND** neither card appears in the shared spread or matches the other

#### Scenario: Signature cards beside a Celtic Cross
- **WHEN** Mira and Sage both respond to a Celtic Cross reading
- **THEN** neither signature card appears among the ten spread cards or matches the other

#### Scenario: No signature card without a draw
- **WHEN** the user sends a message without choosing a spread
- **THEN** neither teller's reply has a signature card
