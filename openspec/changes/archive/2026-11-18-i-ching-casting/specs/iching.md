## ADDED Requirements

### Requirement: App-owned I Ching casting

The application SHALL cast an I Ching reading only when the user chooses it for a message. It SHALL cast six lines from bottom to top with the three-coin method, so each line is 6 (old yin, changing), 7 (yang), 8 (yin) or 9 (old yang, changing). It SHALL derive the primary hexagram from the lines as cast and, when at least one line changes, a relating hexagram with every changing line flipped. Hexagrams SHALL be identified by their King Wen number and name. The same casting SHALL be supplied to every teller responding to that message, persisted with that user message, and remain immutable during interpretation. No signature cards SHALL be drawn for an I Ching casting.

#### Scenario: User chooses an I Ching casting
- **WHEN** a user chooses the I Ching casting
- **THEN** six lines are cast with values from 6 to 9
- **AND** a primary hexagram is identified

#### Scenario: Changing lines give a relating hexagram
- **WHEN** a casting contains at least one line valued 6 or 9
- **THEN** a relating hexagram is included with those lines flipped
- **AND** a casting with no changing lines has no relating hexagram

#### Scenario: Tellers interpret an immutable casting
- **WHEN** tellers respond to a message with a casting
- **THEN** each receives the same casting
- **AND** the teller cannot change the lines or hexagrams

#### Scenario: Casting persists with the conversation
- **WHEN** a conversation with a casting is reopened
- **THEN** the original lines, primary hexagram and relating hexagram are available for rendering

### Requirement: Original hexagram catalog

The catalog SHALL provide all 64 hexagrams with the traditional name and an original Oracle meaning. Provenance SHALL distinguish traditional names and sequence from original interpretive text.

#### Scenario: Catalog is complete
- **WHEN** the catalog is loaded
- **THEN** it contains 64 hexagrams numbered 1 to 64, each with a name and a meaning

### Requirement: Casting validation and display

The frontend SHALL accept only castings with exactly six lines valued 6 to 9, consistent line flags, hexagram numbers from 1 to 64, and a relating hexagram only when a line changes. Invalid data SHALL be omitted and the teller's prose SHALL remain visible. A valid casting SHALL render the primary hexagram as six solid or broken lines, mark changing lines, and show the relating hexagram when present.

#### Scenario: Valid casting renders
- **WHEN** the chat renders a valid casting
- **THEN** the six lines, hexagram name and meaning are shown with changing lines marked

#### Scenario: Invalid casting falls back to prose
- **WHEN** a casting has the wrong line count, a value outside 6 to 9, or a relating hexagram without a changing line
- **THEN** it is omitted and the prose remains
