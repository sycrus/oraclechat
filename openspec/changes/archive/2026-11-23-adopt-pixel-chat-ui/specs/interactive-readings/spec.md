# Spec Delta

## ADDED Requirements

### Requirement: Compact coin toss card
An open coin toss SHALL be shown as one card in the teller's message. The card SHALL show:
- a header with six progress squares and "N of 6"
- one row per line from line 6 at the top to line 1 at the bottom, each with the line as tossed, the three coin faces with the line's value, and the line it becomes
- a full-width toss button

Untossed lines SHALL show as empty outlines. The newest line SHALL be highlighted, and changing lines and their values SHALL use the accent colour. The explanation of how coins count SHALL be hidden behind a "?" button that toggles it.

#### Scenario: Partly cast
- **GIVEN** four lines have been tossed
- **WHEN** the toss card is shown
- **THEN** rows 1 to 4 show their lines, coins and values, rows 5 and 6 are empty outlines, and the header reads "4 of 6"

#### Scenario: Help is folded away
- **WHEN** the toss card is first shown
- **THEN** the coin explanation is hidden
- **AND** pressing "?" shows it, and pressing it again hides it
