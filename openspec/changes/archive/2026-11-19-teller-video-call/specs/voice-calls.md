## Purpose

Lets the owner open a video call with a teller: an animated 3D figure that speaks in the teller's own voice, synthesized locally on the owner's PC.

## ADDED Requirements

### Requirement: Call entry point
The chat header SHALL show a video call button only for a teller whose definition enables calls. Activating it SHALL open a full-screen call overlay for the current conversation without leaving the chat page. An end-call control SHALL close the overlay and return to the chat unchanged.

#### Scenario: Teller with calls enabled
- **GIVEN** a 1:1 conversation with Mira, whose definition enables calls
- **WHEN** the chat header renders
- **THEN** a video call button is shown

#### Scenario: Teller without calls
- **GIVEN** a 1:1 conversation with Sage, whose definition has no call section
- **WHEN** the chat header renders
- **THEN** no video call button is shown

#### Scenario: Ending a call
- **GIVEN** the call overlay is open
- **WHEN** the owner ends the call
- **THEN** the overlay closes and the conversation's messages are unchanged

### Requirement: Teller presence in the call
The overlay SHALL show the teller's 3D model framed head and shoulders, with arms lowered from a T-pose. While not speaking, the teller SHALL be in an idle state with breathing motion and blinks at irregular intervals. If the model fails to load, the overlay SHALL show the teller's avatar image and an error notice instead.

#### Scenario: Idle on open
- **WHEN** the call overlay opens and the model loads
- **THEN** the call state is idle and the teller breathes and blinks

#### Scenario: Missing model file
- **GIVEN** the teller's model file is missing
- **WHEN** the call overlay opens
- **THEN** the overlay shows the avatar image and a "model unavailable" notice
- **AND** the overlay stays usable with subtitles

### Requirement: Speaking a typed sentence
During a call the owner SHALL be able to type a sentence for the teller to speak verbatim. The teller SHALL move from idle to speaking while the audio plays and return to idle when it ends. Sentences submitted while speaking SHALL be queued and spoken in order. Empty input and input over 500 characters SHALL be rejected.

#### Scenario: Typed sentence is spoken
- **GIVEN** the call overlay is open and speech is available
- **WHEN** the owner submits "Hello, I'm Mira"
- **THEN** the teller's voice speaks the sentence
- **AND** the call state goes idle → speaking → idle

#### Scenario: Sentence queued while speaking
- **GIVEN** the teller is speaking
- **WHEN** the owner submits another sentence
- **THEN** it is spoken after the current one finishes

#### Scenario: Over-long sentence
- **WHEN** the owner submits more than 500 characters
- **THEN** the input is rejected with a message and nothing is synthesized

### Requirement: Mouth follows the voice
While the teller speaks, the mouth opening SHALL follow the loudness of the playing audio and SHALL close when the audio is silent or finished.

#### Scenario: Silence closes the mouth
- **GIVEN** the teller is speaking
- **WHEN** the audio level drops to silence
- **THEN** the mouth returns to closed

#### Scenario: Loud audio opens the mouth
- **WHEN** the audio level rises
- **THEN** the mouth opening increases, up to its maximum

### Requirement: Local speech synthesis
The backend SHALL synthesize speech for a call-enabled teller through the configured local speech service, using the teller's voice reference, and return WAV audio. Speech SHALL always be synthesized locally, including when hosted teller replies are configured. Requests for unknown tellers or tellers without calls SHALL be rejected.

#### Scenario: Speech for Mira
- **WHEN** the client requests speech for Mira with a valid sentence
- **THEN** the backend returns WAV audio produced by the local speech service with Mira's voice reference

#### Scenario: Hosted replies do not move speech
- **GIVEN** hosted teller replies are configured
- **WHEN** speech is requested
- **THEN** the request goes to the local speech service and to no hosted endpoint

#### Scenario: Teller without calls
- **WHEN** speech is requested for Sage
- **THEN** the backend rejects the request and contacts no speech service

### Requirement: Voice offline
If the local speech service is not configured or unreachable, the backend SHALL return a "voice offline" error without trying any other voice. The overlay SHALL still open, show a "voice offline" notice, and show each submitted sentence as a subtitle.

#### Scenario: Speech service down
- **GIVEN** the speech service is not running
- **WHEN** the owner submits a sentence in a call
- **THEN** the overlay shows a "voice offline" notice and the sentence as a subtitle
- **AND** no other voice or speech service is used

#### Scenario: Speech service not configured
- **GIVEN** no speech service URL is configured
- **WHEN** speech is requested
- **THEN** the backend returns the "voice offline" error

### Requirement: Traced speech requests
Each speech request SHALL produce a trace span recording the teller id, character count, duration, and outcome. The span SHALL NOT contain the sentence text, the audio, or file paths.

#### Scenario: Successful speech is traced
- **WHEN** speech is synthesized for a sentence
- **THEN** a span records the teller id, the sentence length, the duration and a success outcome
- **AND** the span contains neither the sentence text nor the audio
