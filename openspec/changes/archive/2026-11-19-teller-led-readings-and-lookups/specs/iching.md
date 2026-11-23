## MODIFIED Requirements

### Requirement: App-owned I Ching casting

The application SHALL cast an I Ching reading only for an I Ching teller's reading (see the chat spec). It SHALL cast six lines from bottom to top with the three-coin method, so each line is 6 (old yin, changing), 7 (yang), 8 (yin) or 9 (old yang, changing). It SHALL derive the primary hexagram from the lines as cast and, when at least one line changes, a relating hexagram with every changing line flipped. Hexagrams SHALL be identified by their King Wen number and name. The casting SHALL be supplied to that teller, persisted with its reply, and remain immutable during interpretation. No signature cards SHALL be drawn for an I Ching casting.

#### Scenario: Sage is asked for a reading
- **WHEN** Sage gives a reading
- **THEN** six lines are cast with values from 6 to 9
- **AND** a primary hexagram is identified

#### Scenario: Changing lines give a relating hexagram
- **WHEN** a casting contains at least one line valued 6 or 9
- **THEN** a relating hexagram is included with those lines flipped
- **AND** a casting with no changing lines has no relating hexagram

#### Scenario: Teller interprets an immutable casting
- **WHEN** Sage responds with a casting
- **THEN** it receives the application's casting
- **AND** it cannot change the lines or hexagrams

#### Scenario: Casting persists with the conversation
- **WHEN** a conversation with a casting is reopened
- **THEN** the original lines, primary hexagram and relating hexagram are available for rendering with Sage's reply
