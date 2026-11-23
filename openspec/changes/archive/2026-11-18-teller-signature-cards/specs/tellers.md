## MODIFIED Requirements

### Requirement: MVP tarot profiles

The MVP SHALL load Mira and Sage as tarot tellers. Each teller's personality fields, life context, signature-card lens, relationships and system prompt SHALL be included in the instructions sent to the model. Activation topics, emotional tones and situations SHALL inform relevance ranking. A teller SHALL interpret only the application-provided tarot draw and its own signature card.

#### Scenario: Persona reaches the model
- **WHEN** a teller generates a reply
- **THEN** its instructions contain its voice, humor, emotional register, reframing style, life context and signature lens

## ADDED Requirements

### Requirement: Teller niche

Each teller definition SHALL declare a signature card position and a reading lens. Mira's niche is practical action (`action`); Sage's niche is what lies beneath the surface (`shadow`). A definition without a signature card SHALL be rejected.

#### Scenario: Missing signature card
- **WHEN** a teller definition omits `signatureCard`
- **THEN** it is rejected and does not enter the registry
