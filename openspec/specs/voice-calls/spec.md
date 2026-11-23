## Purpose

Lets the owner open a video call with a teller: an animated 3D figure that speaks in the teller's own voice, synthesized locally on the owner's PC.

## Requirements

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

### Requirement: Teller presence in the call
The overlay SHALL show the teller's 3D model framed head and shoulders, with arms lowered from a T-pose. The framing SHALL be derived from the measured extent of the model's head, so the whole head is visible in the upper part of the frame for any humanoid proportions; if the head cannot be measured, the framing SHALL be derived from the head bone. While not speaking, the teller SHALL be in an idle state, playing a looping idle animation when one is available and otherwise a procedural breathing motion, with blinks at irregular intervals. If the model fails to load, the overlay SHALL show the teller's avatar image and an error notice instead.

#### Scenario: Idle on open
- **WHEN** the call overlay opens and the model loads
- **THEN** the call state is idle and the teller breathes and blinks

#### Scenario: Idle animation
- **GIVEN** an idle animation is available
- **WHEN** the call overlay opens and the model loads
- **THEN** the teller loops the idle animation, blinks, and the whole head stays in frame

#### Scenario: Animations unavailable
- **GIVEN** the animation files are missing or fail to load
- **WHEN** the call overlay opens
- **THEN** the teller stands with arms lowered and breathes procedurally, and the call works as before

#### Scenario: Missing model file
- **GIVEN** the teller's model file is missing
- **WHEN** the call overlay opens
- **THEN** the overlay shows the avatar image and a "model unavailable" notice
- **AND** the overlay stays usable with subtitles

#### Scenario: Human-proportioned model
- **GIVEN** a VRoid-style model whose head is about an eighth of its height
- **WHEN** the call overlay opens
- **THEN** the whole head is visible in the upper part of the frame with the shoulders below it

#### Scenario: Large-headed stylized model
- **GIVEN** a stylized model whose head bone sits at the neck and whose head is a third of its height
- **WHEN** the call overlay opens
- **THEN** the whole head, including anything worn on it, is visible in the upper part of the frame

#### Scenario: VRM 0.x model
- **GIVEN** the teller's model is a VRM 0.x file
- **WHEN** the call overlay opens and the teller later thinks
- **THEN** the arms are lowered from the T-pose, not raised, and the breathing and thinking poses move the same way as on a VRM 1.0 model

#### Scenario: Head cannot be measured
- **GIVEN** a model with no geometry that moves with the head
- **WHEN** the call overlay opens
- **THEN** the camera is placed from the head bone and the call works as before

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
While the teller speaks a sentence, the teller's face SHALL show that sentence's expression (`happy`, `relaxed`, `surprised`, `sad` or neutral), and SHALL return to neutral when idle. If the model has no such expression, the face SHALL stay neutral for that sentence and the call SHALL continue.

#### Scenario: Happy sentence
- **WHEN** the teller speaks a sentence tagged `happy`
- **THEN** the call state's expression is `happy` until that sentence ends

#### Scenario: Model without the expression
- **GIVEN** the teller's model has no `surprised` expression
- **WHEN** the teller speaks a sentence tagged `surprised`
- **THEN** the face stays neutral, the mouth still follows the voice, and the call continues without an error

### Requirement: Thinking while waiting
After a call message is sent and until the first sentence is spoken, the teller SHALL be in a thinking state, posed with a hand near the chin and looking away from the camera, with "…" as the subtitle. If the turn fails or produces no sentences, the teller SHALL return to idle and the overlay SHALL show an error.

#### Scenario: Thinking before the first sentence
- **WHEN** the owner sends a call message
- **THEN** the call state is thinking until the first sentence starts playing

#### Scenario: Thinking over the idle animation
- **GIVEN** the idle animation is playing
- **WHEN** the teller starts thinking
- **THEN** the hand moves toward the chin and the head turns away, eased in over the idle animation, and eased out when thinking ends

#### Scenario: Failed turn
- **WHEN** the turn ends with an error
- **THEN** the call returns to idle and shows the error

### Requirement: Readings during a call
If the teller gives a reading during a call turn, the reading SHALL be saved to the conversation as usual and shown in the call's message panel as a compact result: the tarot cards as pixel cards showing each card's symbol or suit count, with name, position and orientation plus the teller's signature card if one was drawn, the I Ching card, or the chart summary. It SHALL stay until the next reading or the end of the call. For reading data the call cannot show, the panel SHALL show a note naming how many cards were drawn and pointing to the chat.

#### Scenario: Three-card reading
- **WHEN** Mira's three-card reading is revealed in a call
- **THEN** the panel shows the three cards with their names, positions and orientations
- **AND** the cards are in the conversation when the call ends

#### Scenario: Signature card
- **WHEN** Mira's reading in a call includes her signature action card
- **THEN** the panel shows it after the spread, labelled as her action card

#### Scenario: Next reading replaces the cards
- **GIVEN** the panel shows a three-card reading
- **WHEN** Mira gives a one-card reading in a later call turn
- **THEN** only the new reading is shown

#### Scenario: Reading the call cannot show
- **WHEN** a call turn's reading has invalid card data
- **THEN** no cards are shown and the panel shows "Mira gave a reading — see chat"

### Requirement: Mouth follows the voice
While the teller speaks, the mouth SHALL take the vowel shape (`aa`, `ih`, `ou`, `ee`, `oh`) detected in the playing audio, with an opening that follows its loudness, and SHALL close when the audio is silent or finished. If vowel detection cannot start, the mouth opening SHALL follow loudness alone.

#### Scenario: Vowel shape while speaking
- **GIVEN** the teller is speaking
- **WHEN** the analysed audio is mostly an "o" vowel at speaking volume
- **THEN** the `oh` mouth shape is the strongest of the five

#### Scenario: Silence closes the mouth
- **GIVEN** the teller is speaking
- **WHEN** the audio level drops to silence
- **THEN** every mouth shape returns to closed

#### Scenario: Loud audio opens the mouth
- **WHEN** the audio level rises
- **THEN** the mouth opening increases, up to its maximum

#### Scenario: Vowel detection unavailable
- **GIVEN** the vowel analyser failed to start
- **WHEN** the teller speaks
- **THEN** the call continues, and the `aa` opening follows the audio's loudness

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

### Requirement: Talking gestures
While the teller speaks, the body SHALL play a talking animation when one is available, choosing a different one from the previous turn when several exist. It SHALL keep gesturing through the short gaps between sentences of a reply and SHALL return to the idle animation shortly after speaking ends. Without talking animations, the body SHALL stay in its idle motion while speaking.

#### Scenario: Gestures while speaking
- **GIVEN** talking animations are available
- **WHEN** the teller starts speaking a sentence
- **THEN** the body moves from the idle animation into a talking animation

#### Scenario: Gap between sentences
- **GIVEN** the teller is speaking a reply of several sentences
- **WHEN** one sentence ends and the next starts within a second
- **THEN** the body keeps the same talking animation without returning to idle

#### Scenario: Back to idle
- **WHEN** the teller finishes speaking and nothing follows
- **THEN** the body returns to the idle animation within about two seconds

#### Scenario: Varied gestures
- **GIVEN** three talking animations are available
- **WHEN** the teller speaks in two consecutive turns
- **THEN** the second turn uses a different talking animation from the first

### Requirement: Astrology readings in a call
In a call with an astrology teller, a reading with saved birth details SHALL be computed at once, saved to the conversation and shown in the call's message panel as the chart summary. With no saved details, the teller SHALL lay out the birth-details form in the call, per the birth-details rules, and SHALL speak its invitation.

#### Scenario: Astra is callable
- **GIVEN** a 1:1 conversation with Astra, whose definition enables calls
- **WHEN** the chat header renders
- **THEN** a video call button is shown and the call loads her model

#### Scenario: Reading in a call with saved details
- **GIVEN** a call with Astra and saved birth details
- **WHEN** the owner asks for a reading
- **THEN** the chart is saved to the conversation and the call's panel shows the chart summary

#### Scenario: Reading in a call without details
- **GIVEN** a call with Astra and no saved birth details
- **WHEN** the owner asks for a reading
- **THEN** the birth-details form message is saved with her invitation, which she speaks
- **AND** the call's panel shows it

### Requirement: Pixel-filtered teller render
The call SHALL draw the teller's 3D render at a low resolution, about 160 pixels across on a phone, and scale it up to fill the screen without smoothing. Every rendered pixel SHALL be snapped to the nearest colour in a fixed 16-colour call palette, made of the interface palette plus skin, hair and clothing tones. The filter SHALL NOT change the model's framing, animation, expressions or mouth movement. If the filter cannot be set up, the call SHALL fall back to the unfiltered render and keep working.

#### Scenario: Filtered render
- **WHEN** a call opens and the model loads
- **THEN** the teller is drawn in large square pixels using only the call palette

#### Scenario: Nearest colour
- **WHEN** a rendered pixel's colour lies between two palette colours
- **THEN** it is drawn in whichever is nearer

#### Scenario: Filter unavailable
- **GIVEN** the screen offers no 2D drawing context for the filtered frame
- **WHEN** a call opens
- **THEN** the unfiltered render is shown and the call works as before

### Requirement: Call screen layout
The call screen SHALL fill the window with the teller's render.
- **Top bar:** the teller's name in the title font and a status line (connecting, speaking or thinking, voice offline, or microphone unavailable), with the call note beside it.
- **Subtitles:** shown above the call bar.
- **Call bar:** one full-width bar along the bottom edge, solid so it covers the bottom of the render: the typed input, send, the microphone toggle when the microphone is usable, and end call in the danger colour, all on one line. There is no separate messages control; the typed input is always there.
- **Framing:** on a phone-shaped window the camera keeps to the teller's head and shoulders, the head nearly filling the width, so the body below the waist stays out of view.

#### Scenario: Typing in a call
- **WHEN** the user types in the call bar and sends
- **THEN** the message is sent as before, from the same line as the microphone and end-call controls

#### Scenario: No microphone
- **GIVEN** the microphone is blocked
- **WHEN** the call opens
- **THEN** the call bar has the typed input, send and end call, no microphone toggle, and the status line says to type instead

### Requirement: Interactive readings in a call
When a call turn lays out a card fan, coin toss or birth-details form, the call SHALL show it in the message panel just above the call bar. The owner SHALL interact with it there, and each interaction SHALL carry the call flag. After the reveal, the sixth toss or the submission, the panel SHALL show a compact result while the teller speaks the interpretation: the dealt tarot spread with any signature card, the I Ching card, or the chart summary. Their detail views SHALL open above the call. A suggested question chosen from a result SHALL be sent as a call message. The panel SHALL show only readings from the call's own turns.

#### Scenario: Fan in the call
- **GIVEN** a call with Mira
- **WHEN** she lays out a fan
- **THEN** the message panel shows the face-down fan just above the call bar
- **AND** picking and revealing work as in the chat

#### Scenario: Coin toss in the call
- **GIVEN** a call with Sage
- **WHEN** he lays out a coin toss and the owner tosses six times
- **THEN** the panel shows the toss card, then the I Ching card
- **AND** Sage speaks the interpretation

#### Scenario: Birth form in the call
- **GIVEN** a call with Astra and no saved birth details
- **WHEN** she lays out the birth-details form
- **THEN** the panel shows the invite card, and its button opens the form above the call
- **AND** after submitting, the panel shows the chart summary and Astra speaks the reading

#### Scenario: Suggested question
- **WHEN** the owner chooses a suggested question from the I Ching card in a call
- **THEN** it is sent as a call message and the teller answers aloud
