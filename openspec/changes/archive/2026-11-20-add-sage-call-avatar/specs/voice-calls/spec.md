# Spec Delta

## MODIFIED Requirements

### Requirement: Call entry point
The chat header SHALL show a video call button only for a teller whose definition enables calls. Activating it SHALL open a full-screen call overlay for the current conversation without leaving the chat page. An end-call control SHALL close the overlay and return to the chat unchanged.

#### Scenario: Teller with calls enabled
- **GIVEN** a 1:1 conversation with Mira, whose definition enables calls
- **WHEN** the chat header renders
- **THEN** a video call button is shown

#### Scenario: Sage with calls enabled
- **GIVEN** a 1:1 conversation with Sage, whose definition enables calls
- **WHEN** the chat header renders
- **THEN** a video call button is shown

#### Scenario: Teller without calls
- **GIVEN** a 1:1 conversation with a teller whose definition has no call section
- **WHEN** the chat header renders
- **THEN** no video call button is shown

#### Scenario: Ending a call
- **GIVEN** the call overlay is open
- **WHEN** the owner ends the call
- **THEN** the overlay closes and the conversation's messages are unchanged

### Requirement: Local speech synthesis
The backend SHALL synthesize speech for a call-enabled teller through the configured local speech service, using the teller's voice reference, and return WAV audio. Speech SHALL always be synthesized locally, including when hosted teller replies are configured. Requests for unknown tellers or tellers without calls SHALL be rejected.

#### Scenario: Speech for Mira
- **WHEN** the client requests speech for Mira with a valid sentence
- **THEN** the backend returns WAV audio produced by the local speech service with Mira's voice reference

#### Scenario: Speech for Sage
- **WHEN** the client requests speech for Sage with a valid sentence
- **THEN** the backend returns WAV audio produced by the local speech service with Sage's voice reference

#### Scenario: Hosted replies do not move speech
- **GIVEN** hosted teller replies are configured
- **WHEN** speech is requested
- **THEN** the request goes to the local speech service and to no hosted endpoint

#### Scenario: Teller without calls
- **WHEN** speech is requested for a teller whose definition has no call section
- **THEN** the backend rejects the request and contacts no speech service
