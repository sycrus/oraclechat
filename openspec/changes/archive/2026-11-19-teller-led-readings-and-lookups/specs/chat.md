## ADDED Requirements

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

### Requirement: Readings belong to the teller who gave them

A reading SHALL be drawn by the application just before the teller who gives it replies, sent in that teller's `message_start`, persisted with that teller's reply, and shown above it. Tellers replying after it, in this turn or later turns, SHALL receive it labelled with its teller's name as reference they may react to but SHALL NOT interpret as their own. Messages saved before this change with a reading on the user message SHALL still render.

#### Scenario: Second teller reacts to the first's reading
- **WHEN** Mira gives a tarot reading and Sage replies after her
- **THEN** Sage's input contains Mira's reading labelled as Mira's reference
- **AND** Sage does not get a reading unless its route says so

#### Scenario: Reading persists with the reply
- **WHEN** a conversation with a teller's reading is reopened
- **THEN** the reading is shown with that teller's reply

## MODIFIED Requirements

### Requirement: Signature card in the reply

When a tarot teller gives a reading, `message_start` SHALL include its signature card, and the reply SHALL display it labeled by position (Action card) above the reply text, before streaming text arrives.

#### Scenario: Card appears when the teller starts
- **WHEN** a `message_start` event arrives for Mira giving a reading
- **THEN** Mira's action card is shown at the top of Mira's reply

### Requirement: Conversation turns without cards

When a teller gives no reading, it SHALL reply in character without interpreting or inventing a reading, and MAY offer one in its own discipline. It SHALL receive each teller's most recent reading in the conversation and its own most recent signature card, if any, as reference, so it can expand on earlier readings.

#### Scenario: Going deeper into an earlier reading
- **WHEN** Mira gave a three-card reading earlier and the user now asks "tell me more about the present card"
- **THEN** no new reading is drawn unless the router says one was asked for
- **AND** Mira receives her earlier spread as reference and is told not to invent new cards

## REMOVED Requirements

### Requirement: Inline tarot reading

Replaced by "Readings are asked for, not chosen in the composer" and "Readings belong to the teller who gave them". The illustrated inline rendering is unchanged.
