# Spec Delta

## Purpose

Defines OracleChat's opt-in guardrails: the guarded launch mode, the check on each user message, care turns, the per-sentence check on teller replies, and what is sent, shown and traced.

## ADDED Requirements

### Requirement: Guarded launch mode
Guardrails SHALL run only when the backend is started with the guarded launch command. Without it, no message or reply text SHALL be sent to the guardrail service, whatever the environment holds. Guarded mode SHALL require a guardrail API key and a classifier model, and SHALL refuse to start without them.

#### Scenario: Plain start sends nothing out
- **GIVEN** the guardrail key and model are set in the environment
- **WHEN** the backend is started with the plain start command and a turn runs
- **THEN** no request is made to the guardrail service

#### Scenario: Guarded start without configuration
- **GIVEN** the guarded launch command is used
- **WHEN** the guardrail key or model is missing
- **THEN** the backend refuses to start and names the missing variable

#### Scenario: Guardrails are independent of hosted replies
- **GIVEN** guarded mode is on and hosted replies are not configured
- **WHEN** a turn runs
- **THEN** teller replies come from the local model and are still checked

### Requirement: User message check
In guarded mode each user message SHALL be checked before routing. A self-harm signal SHALL start a care turn. Sexual content involving minors SHALL end the turn with an app-written refusal and no teller reply. Other flagged categories SHALL be recorded and the turn SHALL continue.

#### Scenario: Ordinary question
- **WHEN** the user asks "Will my new job work out?"
- **THEN** the turn proceeds normally

#### Scenario: Self-harm signal
- **WHEN** the user's message is flagged for self-harm
- **THEN** the turn is a care turn

#### Scenario: Refused content
- **WHEN** the user's message is flagged for sexual content involving minors
- **THEN** an app-written refusal is shown, no teller replies, and nothing is drawn

### Requirement: Care turn
In a care turn, the application SHALL NOT draw a reading, run a lookup, open an interactive reading or show the birth-details form. Exactly one teller SHALL reply, the least recently spoken, with instructions to step out of the reading and respond sincerely without predictions. The application SHALL then show app-written support text that points to crisis help. The support text MAY name helplines and emergency services, and the application SHALL NOT take any action for the user, such as contacting anyone or opening a link. Memory extraction SHALL NOT run for a care turn, even with memory consent on.

#### Scenario: Care turn in a group chat
- **GIVEN** a two-teller conversation
- **WHEN** a care turn runs
- **THEN** only one teller replies and no reading appears
- **AND** the support text follows the reply

#### Scenario: Care turn saves no memory
- **GIVEN** memory consent is on
- **WHEN** a care turn completes
- **THEN** memory extraction does not run for that turn

#### Scenario: Care turn in a call
- **WHEN** a care turn runs during a call
- **THEN** the teller's reply is spoken and the support text is shown in the chat

### Requirement: Per-sentence reply check
In guarded mode every teller reply sentence SHALL pass moderation and the fortune-telling ethics check before it is shown or spoken. The ethics check SHALL flag fatalism, certainty about health, money or legal outcomes, predictions of another person's death, illness, pregnancy or fidelity, and encouragement to depend on the tellers. When a sentence fails, the application SHALL stop the reply, drop that sentence and all later text, and save the reply ending at the last passing sentence. If no sentence passed, an app-written line SHALL stand in.

#### Scenario: Passing reply
- **WHEN** every sentence of a reply passes
- **THEN** the full reply is shown and saved, sentence by sentence in order

#### Scenario: Fatalistic sentence
- **GIVEN** a reply whose third sentence says the relationship is doomed
- **WHEN** the reply is checked
- **THEN** the first two sentences are shown and saved
- **AND** the third sentence and any later text are never shown, spoken or saved
- **AND** the model stream is stopped

#### Scenario: First sentence fails
- **WHEN** the first sentence of a reply fails
- **THEN** the app-written stand-in line is shown and saved as the reply

#### Scenario: Tarot imagery is not mistaken for harm
- **GIVEN** a reading with Death, The Tower and the Ten of Swords
- **WHEN** an ordinary constructive interpretation is checked
- **THEN** every sentence passes

#### Scenario: Interpretation after an interactive reading
- **WHEN** a teller interprets a revealed fan, completed toss or submitted birth form
- **THEN** that interpretation is checked sentence by sentence too

### Requirement: Fail closed
If a guardrail check errors or times out, the turn SHALL end with an error. No unchecked text SHALL be shown, spoken or saved, and the application SHALL NOT retry without guardrails.

#### Scenario: Moderation unavailable for the user message
- **WHEN** the user message check fails
- **THEN** the turn ends with an error, before routing, with no teller reply

#### Scenario: Check fails mid-reply
- **GIVEN** two sentences have passed
- **WHEN** the check on the third sentence times out
- **THEN** the turn ends with an error and the third sentence is not shown

### Requirement: Guardrail data minimisation
Guardrail requests SHALL contain only the user's message text, or a reply sentence with the reply text before it. They SHALL NOT contain saved memories, conversation history, birth details, reading data, link pages or search results.

#### Scenario: Memories stay local
- **GIVEN** memory consent is on and memories are recalled for a reply
- **WHEN** the reply is checked
- **THEN** no guardrail request contains a memory or the history

### Requirement: Guardrail status and traces
When guarded mode is on, the UI's model status SHALL say that OpenAI guardrails are on. Each check SHALL be traced with its kind, outcome and flagged category, never with the API key, and without message or reply content unless the owner has turned on trace content (`TRACE_CONTENT`, see the `runtime` capability).

#### Scenario: Status shown
- **WHEN** guarded mode is on
- **THEN** the model status reads, for example, "Local models · OpenAI guardrails"

#### Scenario: Traces carry no content
- **GIVEN** trace content is off
- **WHEN** a sentence fails the ethics check
- **THEN** its span records the outcome and category, without the sentence text or the key
