## ADDED Requirements

### Requirement: Open microphone in a call
When a call opens, the overlay SHALL ask for the microphone with echo cancellation and noise suppression and, once allowed, listen for the owner's speech for the whole call. A mic control SHALL mute and unmute listening. Typed messages SHALL keep working in every microphone state. Ending the call SHALL release the microphone.

#### Scenario: Mic on when the call opens
- **GIVEN** the owner has allowed the microphone
- **WHEN** the call opens
- **THEN** the mic control shows the mic as on and the call listens for speech

#### Scenario: Muted
- **GIVEN** the mic is muted
- **WHEN** the owner speaks
- **THEN** nothing is transcribed or sent

#### Scenario: Microphone blocked
- **WHEN** the owner denies microphone access or there is no microphone
- **THEN** the overlay shows "Microphone unavailable — type instead"
- **AND** typed messages still work

#### Scenario: Call ends
- **WHEN** the owner ends the call
- **THEN** the microphone is released

### Requirement: Spoken turns
The overlay SHALL treat speech as a turn when it lasts at least 0.3 s, SHALL end the turn after about 0.8 s of silence, and SHALL end a turn that reaches 20 s. A turn SHALL be transcribed locally. A non-empty transcript SHALL be sent as a call message, exactly as if typed, and shown as the owner's caption while the teller thinks. An empty transcript SHALL send nothing.

#### Scenario: Spoken question
- **GIVEN** the mic is on and the teller is idle
- **WHEN** the owner says "Should I start the novel this week?" and pauses
- **THEN** that text is sent as a call message and the teller starts thinking
- **AND** the message and the reply are saved to the conversation

#### Scenario: Short noise
- **WHEN** a 0.1 s click is picked up
- **THEN** no turn starts and nothing is sent

#### Scenario: Nothing recognised
- **WHEN** a turn is transcribed as empty text
- **THEN** nothing is sent and the call stays as it was

#### Scenario: Long turn
- **WHEN** the owner speaks for 20 s without pausing
- **THEN** the turn ends at 20 s and is transcribed and sent

### Requirement: Interrupting the teller
If the owner speaks for at least 0.3 s while the teller is thinking or speaking, the teller SHALL stop speaking at once and the teller's remaining sentences from that turn SHALL be dropped. The teller's full reply SHALL still be saved to the conversation. The owner's new message SHALL be sent after the interrupted turn's stream has finished.

#### Scenario: Owner talks over the teller
- **GIVEN** Mira is speaking the first of three sentences
- **WHEN** the owner speaks for 0.5 s
- **THEN** her audio stops and the other two sentences are not spoken
- **AND** her full reply is in the chat after the call turn

#### Scenario: New message after an interrupted turn
- **GIVEN** the owner interrupted Mira while her reply was still streaming
- **WHEN** the owner's turn is transcribed
- **THEN** it is sent once her reply has finished streaming, and no earlier sentences are spoken after it

### Requirement: Local speech recognition
Owner speech SHALL be transcribed only by the local speech service, through the backend. Owner audio SHALL NOT be stored, logged or sent to any hosted service, including when hosted teller replies are on. If recognition is not configured or not running, the overlay SHALL show "Can't hear you right now — type instead" and typing SHALL keep working.

#### Scenario: Recognition offline
- **GIVEN** the speech service has no recognition model loaded
- **WHEN** a call opens
- **THEN** the overlay shows "Can't hear you right now — type instead"

#### Scenario: Recognition fails mid-call
- **WHEN** transcribing a turn fails
- **THEN** nothing is sent and the overlay shows "Can't hear you right now — type instead"

#### Scenario: Invalid audio
- **WHEN** the backend receives audio that is not a WAV file, is empty, or is longer than 30 s
- **THEN** it rejects the request and calls nothing else

### Requirement: Traced speech recognition
Each transcription request SHALL produce an `oracle.stt` span with its outcome, audio duration and transcript length. It SHALL NOT include the audio or the transcript text.

#### Scenario: Successful transcription is traced
- **WHEN** a turn is transcribed
- **THEN** an `oracle.stt` span records outcome "ok", the audio duration and the character count, and no text
