## Purpose

Defines the tarot draw behavior for the MVP. The application owns the random draw for a tarot teller who was asked for a reading; the teller only interprets the resulting cards and positions.

---

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

### Requirement: Original card content and artwork

The tarot catalog SHALL provide original Oracle interpretations for upright and reversed orientations for all 78 cards. The inline spread SHALL render each card as original, accessible pixel art (a recognisable symbol for each Major Arcana card, the rank's count of suit symbols for number cards, a crown, helmet or cap over the suit for court cards), drawn upside down when reversed, the same in the chat and in calls, with the orientation-appropriate interpretation. The catalog SHALL record interpretation, naming, and artwork provenance. The app-provided draw remains immutable.

#### Scenario: User reveals an orientation-specific interpretation

- GIVEN a spread is rendered in chat
- WHEN the user selects a card
- THEN its original interpretation for the drawn orientation is disclosed
- AND reversed orientation is communicated accessibly

#### Scenario: Content provenance is recorded

- GIVEN the original Oracle tarot catalog is shipped
- WHEN the content is reviewed
- THEN interpretation authorship, traditional card-name use, and original artwork provenance are documented

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
