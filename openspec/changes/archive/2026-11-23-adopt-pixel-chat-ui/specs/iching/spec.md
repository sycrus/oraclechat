# Spec Delta

## MODIFIED Requirements

### Requirement: Casting validation and display

The frontend SHALL accept only castings with exactly six lines valued 6 to 9, consistent line flags, hexagram numbers from 1 to 64, and a relating hexagram only when a line changes. Invalid data SHALL be omitted and the teller's prose SHALL remain visible. A valid casting SHALL render as a reading card showing the primary hexagram as six solid or broken lines with its number and name, the changing lines marked in the accent colour and, when present, an arrow to the relating hexagram with its number and name. The card's "Line by line" button SHALL open a bottom sheet with each hexagram's name, trigrams and meaning, each changing line's place, value and the way it turns, and the suggested questions. The sheet SHALL close with its close button, the Escape key or a tap on the backdrop.

#### Scenario: Valid casting renders
- **WHEN** the chat renders a valid casting
- **THEN** the card shows the six lines, hexagram number and name, with changing lines marked

#### Scenario: Relating hexagram on the card
- **GIVEN** a casting of hexagram 24 with lines 1 and 6 changing to hexagram 23
- **WHEN** the card is shown
- **THEN** it shows 24 Return, an arrow, and 23 Stripping Away

#### Scenario: Line by line
- **WHEN** the user presses "Line by line"
- **THEN** a sheet opens with both hexagrams' meanings and lines 1 and 6 listed as changing
- **AND** pressing Escape closes it

#### Scenario: Invalid casting falls back to prose
- **WHEN** a casting has the wrong line count, a value outside 6 to 9, or a relating hexagram without a changing line
- **THEN** it is omitted and the prose remains
