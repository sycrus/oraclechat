# Spec Delta

## MODIFIED Requirements

### Requirement: MVP teller conversations

The application SHALL allow a user to start a one-to-one chat with Mira, Sage or Astra, or a group chat with any two of them. Every chat message SHALL identify its sender. A one-to-one chat SHALL route each user message directly to its sole teller. In a group chat both tellers SHALL respond, in the order set by application-owned relevance ranking.

#### Scenario: Start a one-to-one chat
- **WHEN** the user selects Mira alone and sends a message
- **THEN** only Mira is a member and she responds to each user message

#### Scenario: Start a two-teller chat
- **WHEN** the user selects Mira and Sage and sends a message
- **THEN** both tellers respond
- **AND** each response is attributed to its teller

#### Scenario: Start a chat with Astra
- **WHEN** the user selects Astra alone, or Astra with Mira or Sage
- **THEN** the conversation is created and Astra responds

#### Scenario: Three tellers
- **WHEN** a conversation request names Mira, Sage and Astra
- **THEN** it is rejected

### Requirement: Readings are asked for, not chosen in the composer

The composer SHALL contain only the message box and send button. Message requests containing `spread` or `search` SHALL be rejected before the turn starts. Before each responding teller replies, the application SHALL make use the turn router's single call to classify the message as asking this teller (by name, or everyone) for a reading (`named`), asking for a reading without naming anyone (`unnamed`), or neither (`none`). For a tarot teller it SHALL pick the spread the user asked for, otherwise one that fits. A teller SHALL give a reading when its route is `named`, or `unnamed` and it is first in reply order. Every reading SHALL use that teller's own discipline. A failed routing call SHALL mean no reading for any teller.

#### Scenario: Asking one teller by name in a group
- **WHEN** the user writes "Mira, can you read for me?" in a group chat
- **THEN** Mira gives a tarot reading
- **AND** Sage replies without a reading

#### Scenario: Asking everyone
- **WHEN** the user writes "can you both do a reading for me?"
- **THEN** Mira gives a tarot reading and Sage gives an I Ching casting

#### Scenario: Asking without naming anyone
- **WHEN** the user asks for a reading in a group chat without naming a teller
- **THEN** only the first teller in reply order gives a reading

#### Scenario: Teller uses its own skill
- **WHEN** the user asks Sage to "pull a card"
- **THEN** Sage gives an I Ching casting

#### Scenario: Astra uses her own skill
- **GIVEN** birth details are saved
- **WHEN** the user asks Astra to "pull a card" or "look at my chart"
- **THEN** Astra gives an astrology reading

#### Scenario: Asking Astra and Mira together
- **GIVEN** a group chat with Astra and Mira and saved birth details
- **WHEN** the user writes "can you both read for me?"
- **THEN** Astra gives an astrology reading and Mira gives a tarot reading

#### Scenario: Requested spread is honoured
- **WHEN** the user asks Mira for a Celtic Cross
- **THEN** Mira's reading is a Celtic Cross

#### Scenario: Accepting an offered reading
- **WHEN** a teller offered a reading in the previous turn and the user replies "yes, go ahead"
- **THEN** that teller gives a reading

#### Scenario: No request, no reading
- **WHEN** the user's message doesn't ask for a reading
- **THEN** no teller draws or casts

#### Scenario: Old composer fields are rejected
- **WHEN** a message request includes `spread` or `search`
- **THEN** it is rejected with a 400 before the turn starts
