# Spec Delta

## MODIFIED Requirements

### Requirement: Bounded teller history

The conversation history sent to a teller SHALL be limited to the newest messages that fit `HISTORY_TOKEN_BUDGET` (default 8,000 estimated tokens). The newest user message SHALL always be included. When earlier messages are omitted, the history SHALL begin with an omission marker. Teller instructions, consented memories and the tarot draw SHALL NOT count against or be cut by this budget. The history SHALL be rebuilt from the stored messages for every reply. Omitted messages SHALL be dropped, not summarised.

#### Scenario: Long conversation stays in budget
- **WHEN** a conversation has 25 turns and the user sends another message
- **THEN** the teller's history fits the budget, includes the newest message, and starts with the omission marker
- **AND** the teller's persona instructions are unchanged

#### Scenario: Dropped history is not summarised
- **GIVEN** a conversation longer than the budget
- **WHEN** a teller replies
- **THEN** the omitted messages are absent from the teller's input, with only the omission marker in their place
- **AND** no summary of them is made or stored

## ADDED Requirements

### Requirement: Messages are saved when complete

The user's message SHALL be saved before routing. A teller reply SHALL be saved only once its stream completes. A reply interrupted by a model error or a restart SHALL NOT be saved, and the conversation SHALL continue from the last saved message. There SHALL be no mid-reply checkpoint or resume.

#### Scenario: Interrupted reply
- **GIVEN** a teller has streamed part of a reply
- **WHEN** the model call fails
- **THEN** the turn ends with an error, the user's message stays saved, and no partial teller reply is saved

#### Scenario: Restart mid-reply
- **WHEN** the backend restarts while a reply is streaming
- **THEN** on reopening the conversation, it shows the messages saved before that reply, and the next message continues from them
