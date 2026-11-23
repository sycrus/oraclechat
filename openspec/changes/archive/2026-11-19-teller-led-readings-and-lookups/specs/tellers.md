## MODIFIED Requirements

### Requirement: MVP tarot profiles

The MVP SHALL load Mira as the tarot teller and Sage as the I Ching teller. Each teller's personality fields, life context, reading lens, relationships and system prompt SHALL be included in the instructions sent to the model. Activation topics, emotional tones and situations SHALL inform relevance ranking. A teller SHALL interpret only readings the application drew or cast for it, and its own signature card if it has one.

#### Scenario: Persona reaches the model
- **WHEN** a teller generates a reply
- **THEN** its instructions contain its voice, humor, emotional register, reframing style, life context and reading lens

#### Scenario: Mira and Sage load as the MVP roster

- GIVEN the teller definition directory is loaded
- WHEN the roster is listed
- THEN it contains Mira as a tarot teller and Sage as an I Ching teller

#### Scenario: Profile activates relevance ranking

- GIVEN a group message and the Mira/Sage activation profiles
- WHEN orchestration ranks the tellers
- THEN the local ranker evaluates each profile against the message and consented context

### Requirement: Teller niche

Each teller definition SHALL declare a discipline and a reading lens. A tarot teller SHALL also declare a signature card position; a teller of another discipline SHALL NOT. Mira's niche is practical action, read through tarot with an `action` card. Sage's niche is what lies beneath the surface, read through the I Ching. A definition missing its reading lens, a tarot definition without a signature card, or a non-tarot definition with one SHALL be rejected.

#### Scenario: Missing reading lens
- **WHEN** a teller definition omits `readingLens`
- **THEN** it is rejected and does not enter the registry

#### Scenario: Tarot teller without a signature card
- **WHEN** a tarot teller definition omits `signatureCard`
- **THEN** it is rejected and does not enter the registry

#### Scenario: I Ching teller with a signature card
- **WHEN** an I Ching teller definition declares `signatureCard`
- **THEN** it is rejected and does not enter the registry
