# Spec Delta

## MODIFIED Requirements

### Requirement: Chart validation and display
The frontend SHALL accept only charts with ten planets, signs and degrees in range, houses 1 to 12, and aspects and transits naming known points. A valid chart SHALL render above the teller's reply as a summary card containing:
- a small wheel
- the Sun, Moon and ascendant with sign and degree
- the active transits, with up to two named and a count of the rest
- an "Open full chart" button

The full chart view SHALL show the wheel of signs, whole-sign house numbers and planets, with the ascendant on the left. Planet markers SHALL be spread so none overlap, and selecting one SHALL show its placement as text. Placements (with the ascendant and midheaven), Transits and Aspects SHALL each be a tab of text rows, alongside the suggested questions. Invalid data SHALL be left out and the teller's prose SHALL stay visible.

#### Scenario: Valid chart renders
- **WHEN** the chat renders a valid astrology reading
- **THEN** the summary card with Sun, Moon and ascendant is shown above Astra's reply

#### Scenario: Full chart
- **WHEN** the user presses "Open full chart"
- **THEN** the wheel and the Placements tab are shown, and the Transits and Aspects tabs list the reading's transits and natal aspects

#### Scenario: Selecting a planet
- **WHEN** the user selects the Moon marker on the wheel
- **THEN** the view shows "Moon in Scorpio 2°, 10th house" as text

#### Scenario: Crowded planets
- **GIVEN** Uranus and Neptune are 4° apart
- **WHEN** the wheel is drawn
- **THEN** their markers do not overlap

#### Scenario: Invalid chart falls back to prose
- **WHEN** a chart has a missing planet, a degree of 30 or more, or a house outside 1 to 12
- **THEN** it is not shown and the prose stays visible

#### Scenario: Readable without the wheel
- **WHEN** a screen reader reaches the chart
- **THEN** each placement is read as text, such as "Moon in Cancer, 12°, 4th house"
