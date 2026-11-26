## ADDED Requirements

### Requirement: Milo call presence
Milo SHALL be callable in a one-to-one conversation using the Cool Polygonal Mind VRM and his named local voice reference. If the voice clip is unavailable, the call SHALL still show his model and use the existing voice-offline notice and subtitles.

#### Scenario: Milo's VRM is available
- **GIVEN** a one-to-one conversation with Milo
- **WHEN** the owner opens a call
- **THEN** his VRM loads in the call stage

#### Scenario: Milo's voice reference is missing
- **GIVEN** a call with Milo and no local `milo.wav` voice reference
- **WHEN** he replies
- **THEN** the call shows the voice-offline notice and his subtitle
- **AND** the call remains usable
