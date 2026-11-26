## Purpose

Defines tellers as reusable character profiles with a discipline, personality, activation profile, reading lens, and optional relationships. The first release ships with Mira (tarot) and Sage (I Ching).

## Requirements

### Requirement: Teller identity and validation

Each teller SHALL have a unique kebab-case identifier, display name, avatar reference, supported discipline, personality fields, and activation profile. Duplicate identifiers or invalid definitions SHALL be rejected.

#### Scenario: Duplicate teller identifier

- GIVEN a teller is already registered
- WHEN a second definition uses the same identifier
- THEN registration rejects it as a duplicate

#### Scenario: Invalid definition

- GIVEN a teller definition has an unsupported discipline or missing required profile field
- WHEN the definition is loaded
- THEN it is rejected and does not enter the registry

### Requirement: Core teller profiles

The roster SHALL load Mira as the tarot teller, Sage as the I Ching teller, Astra as the astrology teller, and Milo as the workplace-reflection teller. Each teller's personality fields, life context, reading lens, relationships and system prompt SHALL be included in the instructions sent to the model. Activation topics, emotional tones and situations SHALL inform relevance ranking. A teller SHALL interpret only readings the application drew, cast or computed for it, and its own signature card if it has one.

#### Scenario: Persona reaches the model
- **WHEN** a teller generates a reply
- **THEN** its instructions contain its voice, humor, emotional register, reframing style, life context and reading lens

#### Scenario: Core teller roster

- GIVEN the teller definition directory is loaded
- WHEN the roster is listed
- THEN it contains Mira as a tarot teller, Sage as an I Ching teller, Astra as an astrology teller and Milo as a workplace-reflection teller

#### Scenario: Profile activates relevance ranking

- GIVEN a group message and the activation profiles of its two tellers
- WHEN orchestration ranks the tellers
- THEN the local ranker evaluates each profile against the message and consented context

### Requirement: Packaged MVP teller definitions
The backend production build SHALL include the YAML definitions for Mira, Sage, Astra and Milo at the path used by the runtime teller registry.

#### Scenario: Compiled service loads the MVP roster
- **WHEN** the compiled backend starts with its distribution assets
- **THEN** the registry contains Mira, Sage, Astra and Milo
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

### Requirement: Restrained, owned life details

Teller instructions SHALL tell each teller not to open a reply with a life detail, to use at most one per reply, never to present another teller's pets, home or habits as their own, and not to copy how another teller opened.

#### Scenario: Shared history does not spread one teller's details
- **WHEN** Mira's earlier reply mentions her cat and Sage replies next
- **THEN** Sage's instructions forbid adopting Mira's details or opening

### Requirement: Conversational reply length

Teller instructions SHALL ask for chat-style replies: about 50 words at most (1–3 short sentences) on turns without cards, and about 120 words in total on reading turns, without headings, bullet lists or per-card sections, and with at most one question.

#### Scenario: Casual message
- **WHEN** the user sends a message without cards
- **THEN** each teller's instructions and turn note ask for 1–3 short sentences

#### Scenario: Reading
- **WHEN** the user draws three cards
- **THEN** each teller's turn context asks for a reply of about 120 words that weaves the cards together

### Requirement: Optional call configuration
A teller definition MAY declare a `call` section naming the teller's voice reference clip. Only tellers with a `call` section SHALL have speech synthesized for them. A `call` section without a voice reference SHALL be rejected. Mira, Sage, Astra and Milo declare one.

#### Scenario: Mira is callable
- **GIVEN** the MVP roster is loaded
- **WHEN** the registry is read
- **THEN** Mira, Sage, Astra and Milo each have a call configuration

#### Scenario: Incomplete call section
- **GIVEN** a teller definition has a `call` section without a voice reference
- **WHEN** the definition is loaded
- **THEN** it is rejected and does not enter the registry
