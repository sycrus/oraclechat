## ADDED Requirements

### Requirement: Teller signature cards

Each responding teller SHALL receive one additional application-drawn signature card in its defined position (`action` for Mira, `shadow` for Sage). Signature cards SHALL be distinct from the shared spread and from each other within a turn, SHALL carry an orientation and the orientation-specific meaning, SHALL be persisted with that teller's reply, and SHALL be immutable during interpretation. The shared spread remains identical for every teller.

#### Scenario: Each teller draws its own card
- **WHEN** Mira and Sage both respond to a three-card reading
- **THEN** Mira receives an action card and Sage receives a shadow card
- **AND** neither card appears in the shared spread or matches the other

#### Scenario: Signature card persists with the reply
- **WHEN** the conversation is reopened
- **THEN** each teller reply shows its signature card with name, position and orientation
