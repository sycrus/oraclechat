## ADDED Requirements

### Requirement: Optional call configuration
A teller definition MAY declare a `call` section naming the teller's voice reference clip. Only tellers with a `call` section SHALL have speech synthesized for them. A `call` section without a voice reference SHALL be rejected. In this release only Mira declares one.

#### Scenario: Mira is callable
- **GIVEN** the MVP roster is loaded
- **WHEN** the registry is read
- **THEN** Mira has a call configuration and Sage does not

#### Scenario: Incomplete call section
- **GIVEN** a teller definition has a `call` section without a voice reference
- **WHEN** the definition is loaded
- **THEN** it is rejected and does not enter the registry
