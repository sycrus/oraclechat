## MODIFIED Requirements

### Requirement: Speaking a typed sentence
In debug mode (the page opened with `?say=1`), the owner SHALL be able to type a sentence for the teller to speak verbatim, without sending it to the conversation. The teller SHALL move from idle to speaking while the audio plays and return to idle when it ends. Sentences submitted while speaking SHALL be queued and spoken in order. Empty input and input over 500 characters SHALL be rejected.

#### Scenario: Typed sentence is spoken
- **GIVEN** the call overlay is open in debug mode and speech is available
- **WHEN** the owner submits "Hello, I'm Mira"
- **THEN** the teller's voice speaks the sentence
- **AND** the call state goes idle → speaking → idle
- **AND** no message is added to the conversation

#### Scenario: Sentence queued while speaking
- **GIVEN** the teller is speaking
- **WHEN** the owner submits another sentence
- **THEN** it is spoken after the current one finishes

#### Scenario: Over-long sentence
- **WHEN** the owner submits more than 500 characters
- **THEN** the input is rejected with a message and nothing is synthesized

## ADDED Requirements

### Requirement: Talking with the teller in a call
Outside debug mode, a message typed in the call SHALL be sent to the conversation as a call message. It SHALL be saved, routed and used for memory like any chat message, and the teller's reply SHALL be saved to the conversation and shown in the chat after the call turn. Call messages SHALL be accepted only in a one-to-one conversation with a teller that can be called.

#### Scenario: Call message reaches the conversation
- **GIVEN** a call with Mira is open
- **WHEN** the owner types "Should I start the novel this week?"
- **THEN** the message and Mira's reply are saved to the conversation
- **AND** both appear in the chat transcript

#### Scenario: Call flag on a group conversation
- **WHEN** a call message is sent to a conversation with Mira and Sage
- **THEN** the request is rejected and nothing is saved

### Requirement: Spoken sentences
For a call message, the teller SHALL be asked for spoken-style replies with no markdown, lists or links, each sentence starting with an emotion tag. The reply SHALL be streamed to the call as complete sentences, each with its text and expression, in order, as soon as each sentence is complete. The teller SHALL speak them in that order.

#### Scenario: Reply spoken sentence by sentence
- **GIVEN** Mira replies "[happy] Yes, start it. [relaxed] One page is enough for day one."
- **WHEN** the reply streams
- **THEN** the call receives "Yes, start it." with `happy` before the reply has finished
- **AND** then "One page is enough for day one." with `relaxed`

#### Scenario: Final sentence without punctuation
- **WHEN** the reply ends without closing punctuation
- **THEN** the remaining text is still sent as a final sentence

### Requirement: Tags never reach the transcript
Emotion tags SHALL be removed from the spoken text, the subtitle, the streamed chat text and the saved reply. A missing or unknown tag SHALL mean a neutral expression. Chat messages sent without the call flag SHALL be unchanged.

#### Scenario: Saved reply is clean
- **WHEN** a call reply containing tags is saved
- **THEN** the saved content contains no `[happy]`, `[relaxed]`, `[surprised]`, `[sad]` or other leading tag

#### Scenario: Unknown tag
- **WHEN** a sentence starts with `[smug]`
- **THEN** the tag is removed and the sentence is spoken with a neutral expression

#### Scenario: Ordinary chat unaffected
- **WHEN** a message is sent without the call flag
- **THEN** the teller is not asked for tags and no sentence events are produced

### Requirement: Expressions follow the sentence
While the teller speaks a sentence, the teller's face SHALL show that sentence's expression (`happy`, `relaxed`, `surprised`, `sad` or neutral), and SHALL return to neutral when idle.

#### Scenario: Happy sentence
- **WHEN** the teller speaks a sentence tagged `happy`
- **THEN** the call state's expression is `happy` until that sentence ends

### Requirement: Thinking while waiting
After a call message is sent and until the first sentence is spoken, the teller SHALL be in a thinking state, posed with a hand near the chin and looking away from the camera, with "…" as the subtitle. If the turn fails or produces no sentences, the teller SHALL return to idle and the overlay SHALL show an error.

#### Scenario: Thinking before the first sentence
- **WHEN** the owner sends a call message
- **THEN** the call state is thinking until the first sentence starts playing

#### Scenario: Failed turn
- **WHEN** the turn ends with an error
- **THEN** the call returns to idle and shows the error

### Requirement: Readings during a call
If the teller draws a reading during a call turn, the reading SHALL be saved to the conversation as usual and the overlay SHALL show a note naming how many cards were drawn and pointing to the chat.

#### Scenario: Three-card reading
- **WHEN** Mira draws a three-card reading in a call turn
- **THEN** the overlay shows "Mira drew 3 cards — see chat"
- **AND** the cards are in the conversation when the call ends
