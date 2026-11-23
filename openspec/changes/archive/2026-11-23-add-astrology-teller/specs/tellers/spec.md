# Spec Delta

## MODIFIED Requirements

### Requirement: MVP tarot profiles

The MVP SHALL load Mira as the tarot teller, Sage as the I Ching teller and Astra as the astrology teller. Each teller's personality fields, life context, reading lens, relationships and system prompt SHALL be included in the instructions sent to the model. Activation topics, emotional tones and situations SHALL inform relevance ranking. A teller SHALL interpret only readings the application drew, cast or computed for it, and its own signature card if it has one.

#### Scenario: Persona reaches the model
- **WHEN** a teller generates a reply
- **THEN** its instructions contain its voice, humor, emotional register, reframing style, life context and reading lens

#### Scenario: Mira and Sage load as the MVP roster

- GIVEN the teller definition directory is loaded
- WHEN the roster is listed
- THEN it contains Mira as a tarot teller, Sage as an I Ching teller and Astra as an astrology teller

#### Scenario: Profile activates relevance ranking

- GIVEN a group message and the activation profiles of its two tellers
- WHEN orchestration ranks the tellers
- THEN the local ranker evaluates each profile against the message and consented context

### Requirement: Packaged MVP teller definitions
The backend production build SHALL include the YAML definitions for Mira, Sage and Astra at the path used by the runtime teller registry.

#### Scenario: Compiled service loads the MVP roster
- **WHEN** the compiled backend starts with its distribution assets
- **THEN** the registry contains Mira, Sage and Astra
- **AND** a conversation can be created for any of them

### Requirement: Teller niche

Each teller definition SHALL declare a discipline and a reading lens. A tarot teller SHALL also declare a signature card position; a teller of another discipline SHALL NOT. Mira's niche is practical action, read through tarot with an `action` card. Sage's niche is what lies beneath the surface, read through the I Ching. Astra's niche is timing, cycles and seasons of life, read through the natal chart and its transits. A definition missing its reading lens, a tarot definition without a signature card, or a non-tarot definition with one SHALL be rejected.

#### Scenario: Missing reading lens
- **WHEN** a teller definition omits `readingLens`
- **THEN** it is rejected and does not enter the registry

#### Scenario: Tarot teller without a signature card
- **WHEN** a tarot teller definition omits `signatureCard`
- **THEN** it is rejected and does not enter the registry

#### Scenario: I Ching teller with a signature card
- **WHEN** an I Ching teller definition declares `signatureCard`
- **THEN** it is rejected and does not enter the registry

#### Scenario: Astrology teller without a birth-details invitation
- **WHEN** an astrology teller definition omits the invitation shown with the birth-details form
- **THEN** it is rejected and does not enter the registry

#### Scenario: Birth-details invitation on another discipline
- **WHEN** a tarot or I Ching teller definition declares a birth-details invitation
- **THEN** it is rejected and does not enter the registry

### Requirement: Optional call configuration
A teller definition MAY declare a `call` section naming the teller's voice reference clip. Only tellers with a `call` section SHALL have speech synthesized for them. A `call` section without a voice reference SHALL be rejected. In this release Mira, Sage and Astra declare one.

#### Scenario: Mira is callable
- **GIVEN** the MVP roster is loaded
- **WHEN** the registry is read
- **THEN** Mira, Sage and Astra each have a call configuration

#### Scenario: Incomplete call section
- **GIVEN** a teller definition has a `call` section without a voice reference
- **WHEN** the definition is loaded
- **THEN** it is rejected and does not enter the registry
