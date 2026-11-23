## Purpose

Defines the astrology reading Astra gives when asked: an app-computed natal chart from the user's saved birth details, plus the transits active at reading time. The application owns the chart; the teller only interprets it.

## Requirements

### Requirement: App-owned natal chart
When an astrology teller gives a reading and birth details are saved, the application SHALL compute the natal chart from them: the Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune and Pluto by tropical sign, degree and whole-sign house, with retrograde marked; the ascendant and midheaven; and major aspects between natal points.

#### Scenario: Astra is asked for a reading with saved details
- **GIVEN** birth details are saved
- **WHEN** Astra is asked for a reading
- **THEN** the reading contains ten planets, each with a sign, a degree from 0 to under 30 and a house from 1 to 12
- **AND** it contains the ascendant and midheaven by sign and degree

#### Scenario: Known chart is reproduced
- **GIVEN** a reference birth date, time and place with a published chart
- **WHEN** the chart is computed
- **THEN** each planet's ecliptic longitude is within 0.1° of the reference (the Moon within 0.3°) and the ascendant within 0.5°

#### Scenario: Whole-sign houses
- **WHEN** the ascendant is in a sign
- **THEN** that sign is the first house and each following sign is the next house

#### Scenario: High-latitude birth place
- **GIVEN** a birth place north of the Arctic Circle
- **WHEN** the chart is computed
- **THEN** every planet still has a house

### Requirement: Birth time converted with historical time zone rules
The application SHALL convert the local birth time to universal time with the birth place's time zone rules in force on the birth date, including daylight saving time. A local time that falls twice SHALL use the earlier occurrence, and a local time that does not exist SHALL be moved forward by the gap; in both cases the reading SHALL note it.

#### Scenario: Daylight saving time at birth
- **GIVEN** a birth in New York on 1990-07-01 at 12:00
- **WHEN** the chart is computed
- **THEN** the universal time used is 16:00

#### Scenario: Ambiguous local time
- **GIVEN** a birth time that occurs twice because clocks went back
- **WHEN** the chart is computed
- **THEN** the earlier occurrence is used and the reading notes the ambiguity

### Requirement: Major aspects
The application SHALL find conjunctions (0°), sextiles (60°), squares (90°), trines (120°) and oppositions (180°) between natal planets, the ascendant and the midheaven, using orbs of 8° (6° for sextiles), each with its exact orb.

#### Scenario: Aspect within orb
- **WHEN** two natal planets are 92° apart
- **THEN** a square with a 2° orb is listed

#### Scenario: Aspect outside orb
- **WHEN** two natal planets are 67° apart
- **THEN** no aspect is listed between them

### Requirement: Transits at reading time
The application SHALL compute the planets' positions at the moment of the reading and list transits from Jupiter, Saturn, Uranus, Neptune, Pluto and Mars to the natal planets, ascendant and midheaven within a 2° orb, each with the transiting planet, aspect, natal point and orb, and the natal house the transiting planet is in.

#### Scenario: Transits are listed
- **WHEN** Astra gives a reading
- **THEN** the reading includes its computation time and every transit within 2°, closest first

#### Scenario: Readings on different days
- **GIVEN** the same saved birth details
- **WHEN** Astra reads on two dates months apart
- **THEN** the natal charts are identical and the transits differ

### Requirement: Teller interprets an immutable chart
The chart SHALL be supplied to the astrology teller, persisted with its reply and stay unchanged during interpretation. The teller's input SHALL contain the computed positions, aspects and transits with their catalog meanings, and SHALL NOT contain the birth date, time or place.

#### Scenario: Teller receives the chart, not the details
- **WHEN** Astra replies with a reading
- **THEN** her input contains the chart's signs, houses, aspects and transits
- **AND** it contains none of the saved birth date, time or place name

#### Scenario: Chart persists with the reply
- **WHEN** a conversation with an astrology reading is reopened
- **THEN** the original chart and transits are shown with Astra's reply, even if the birth details were changed or deleted since

### Requirement: Coarse charts for hosted replies
Exact degrees can reveal a birth date and time, so when teller replies are hosted and the owner has not turned on sharing saved details with the hosted model, the astrology teller's input SHALL contain signs, houses, retrograde flags and aspect and transit names, and SHALL NOT contain degrees or orbs. With sharing on, or with local replies, it SHALL contain the full chart. The saved and displayed chart SHALL always be complete.

#### Scenario: Hosted without sharing
- **GIVEN** hosted replies are configured and sharing saved details is off
- **WHEN** Astra gives a reading
- **THEN** her input names "Moon in Cancer, 4th house" with no degree, and the chat shows the full chart

#### Scenario: Hosted with sharing
- **GIVEN** hosted replies are configured and sharing saved details is on
- **WHEN** Astra gives a reading
- **THEN** her input contains degrees and orbs

### Requirement: Reading without saved details
When an astrology teller is asked for a reading and no birth details are saved, the application SHALL NOT compute or invent a chart. In the chat it SHALL lay out the inline birth-details form (see the birth-details spec); the teller SHALL reply without a reading, inviting the user to fill it in.

#### Scenario: No details in the chat
- **GIVEN** no birth details are saved
- **WHEN** the user asks Astra for a reading
- **THEN** the birth-details form is shown and no chart is saved

#### Scenario: Details submitted from the form
- **GIVEN** the inline birth-details form is open
- **WHEN** the user submits valid details with consent
- **THEN** the chart is computed and Astra's interpretation follows

### Requirement: Original astrology catalog
The catalog SHALL provide the 10 planets, 12 signs, 12 houses and 5 major aspects, each with its traditional name and an original Oracle meaning. Provenance SHALL distinguish traditional names and symbols from Oracle's own interpretive text.

#### Scenario: Catalog is complete
- **WHEN** the catalog is loaded
- **THEN** it contains 10 planets, 12 signs, 12 houses and 5 aspects, each with a name and a meaning

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
