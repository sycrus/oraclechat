# Spec Delta

## MODIFIED Requirements

### Requirement: App-owned I Ching casting
The application SHALL cast an I Ching reading only for an I Ching teller's reading (see the chat spec). It SHALL cast six lines from bottom to top with the three-coin method, so each line is 6 (old yin, changing), 7 (yang), 8 (yin) or 9 (old yang, changing). It SHALL derive the primary hexagram from the lines as cast and, when at least one line changes, a relating hexagram with every changing line flipped. Hexagrams SHALL be identified by their King Wen number and name. The casting SHALL be supplied to that teller, persisted with its reply, and remain immutable during interpretation. No signature cards SHALL be drawn for an I Ching casting. When a toss-enabled I Ching teller is asked for a reading, in the chat or in a call, the application SHALL instead lay out the interactive coin toss per the interactive readings spec, whose completed cast follows all the casting rules here; a teller without the coin toss SHALL keep receiving an immediate casting.

#### Scenario: Sage is asked for a reading
- **GIVEN** Sage's definition has no coin toss
- **WHEN** Sage gives a reading
- **THEN** six lines are cast with values from 6 to 9
- **AND** a primary hexagram is identified

#### Scenario: Sage with the coin toss is asked in chat
- **GIVEN** Sage's definition enables the coin toss
- **WHEN** Sage is asked for a reading in the chat
- **THEN** the interactive coin toss is laid out instead of an immediate casting

#### Scenario: Changing lines give a relating hexagram
- **WHEN** a casting contains at least one line valued 6 or 9
- **THEN** a relating hexagram is included with those lines flipped
- **AND** a casting with no changing lines has no relating hexagram

#### Scenario: Teller interprets an immutable casting
- **WHEN** Sage responds with a casting
- **THEN** it receives the application's casting unchanged
- **AND** it cannot change the lines or hexagrams

#### Scenario: Casting persists with the conversation
- **WHEN** a conversation with a casting is reopened
- **THEN** the original lines, primary hexagram and relating hexagram are available for rendering with Sage's reply

#### Scenario: Calls use the coin toss
- **GIVEN** a call with Sage, whose definition enables the coin toss
- **WHEN** the owner asks for a reading in the call
- **THEN** the interactive coin toss is laid out instead of an immediate casting
