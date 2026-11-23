# Spec Delta

## Purpose

Defines interactive reading messages: a closed, app-owned catalog of message kinds the user can act on, with hidden state kept on the server and validated interaction events. The first kind is the tarot card fan, where the user picks face-down cards for a teller to interpret.

## ADDED Requirements

### Requirement: Closed catalog of interactive kinds
The application SHALL offer interactive messages only from a closed catalog, each kind with a validated payload and a fixed set of interactions. Teller text and model output SHALL NOT create, choose or alter a kind, a payload or an interaction. An unknown kind or an invalid payload SHALL be omitted and the message's text shown as plain prose.

#### Scenario: Teller text cannot make a fan
- **GIVEN** a teller's reply text contains JSON or a tag that looks like a card fan
- **WHEN** the chat renders the message
- **THEN** the reply is shown as ordinary text and no fan appears

#### Scenario: Unknown kind
- **GIVEN** a saved message names a kind that is not in the catalog
- **WHEN** the chat renders it
- **THEN** only the message text is shown

#### Scenario: Invalid fan payload
- **GIVEN** a fan payload has a wrong card count, a picked index out of range or an unknown state
- **WHEN** the chat renders it
- **THEN** the fan is omitted and the message text remains visible

### Requirement: Card fan enabled per teller
A tarot teller's definition MAY enable the card fan and SHALL then give the invitation text shown with it. A teller definition SHALL be rejected if a non-tarot teller enables the fan or a teller enables it without invitation text. A teller without the fan, and every turn sent as a call message, SHALL keep giving immediate readings.

#### Scenario: Mira has the fan
- **WHEN** the teller definitions load
- **THEN** Mira's definition enables the fan with an invitation

#### Scenario: Fan on a non-tarot teller
- **WHEN** a definition for an I Ching teller enables the card fan
- **THEN** the definition is rejected

#### Scenario: Sage still casts at once
- **WHEN** Sage is asked for a reading
- **THEN** the casting is shown at once, as before

#### Scenario: Calls keep immediate readings
- **GIVEN** a call with Mira
- **WHEN** the owner asks for a reading in the call
- **THEN** the spread is drawn and shown in the call at once, with no fan

### Requirement: Laying out the fan
When a fan-enabled tarot teller is asked for a reading in the chat, the application SHALL give it as a fan: a message from that teller whose text is her invitation, with a fan of face-down cards and the spread's positions. The fan SHALL hold more cards than the spread needs, and the spread SHALL be the one in the teller's route, three-card when none. No model call SHALL write the invitation.

#### Scenario: Mira is asked for a three-card reading
- **WHEN** the user asks Mira for a reading and the router names no spread
- **THEN** Mira's message shows her invitation and a fan of face-down cards
- **AND** three picks are needed to reveal

#### Scenario: Requested spread is honoured
- **WHEN** the user asks Mira for a Celtic Cross
- **THEN** her fan needs ten picks

#### Scenario: Both tellers asked
- **WHEN** the user asks both Mira and Sage for a reading
- **THEN** Mira lays out a fan and Sage's casting is shown at once

#### Scenario: A new request closes the open fan
- **GIVEN** Mira's fan is open and unrevealed
- **WHEN** the user asks Mira for another reading
- **THEN** the earlier fan is shown as set aside and can no longer be picked
- **AND** a new fan is laid out

### Requirement: Fan cards stay hidden until the reveal
The application SHALL decide every fan card's identity and orientation when the fan is laid out and keep them on the server. Until the user reveals, they SHALL NOT appear in any response, stream event, saved-conversation payload sent to the browser, or teller input. Cards not picked SHALL never be shown.

#### Scenario: Fan payload carries no identities
- **WHEN** the browser receives a laid-out fan
- **THEN** it contains the number of cards and the picks so far, and no card names, art keys, orientations or meanings

#### Scenario: Reload before the reveal
- **GIVEN** a fan is open
- **WHEN** the conversation is reopened
- **THEN** the fan is shown face-down with the saved picks and no identities

#### Scenario: Chatting while a fan is open
- **GIVEN** a fan is open
- **WHEN** the user sends another message
- **THEN** no teller's input contains any fan card

#### Scenario: Unpicked cards stay hidden
- **WHEN** the user reveals a three-card reading from a fan of nine
- **THEN** only the three picked cards and the signature card are ever sent to the browser

### Requirement: Picking cards
The user SHALL be able to pick cards from the fan up to the number of positions in the spread, and to unpick a card. Revealing SHALL need exactly that many picks. Picks SHALL be saved as they are made.

#### Scenario: Picking and unpicking
- **GIVEN** an open three-card fan
- **WHEN** the user picks three cards and unpicks one
- **THEN** two cards are picked and reveal is not available

#### Scenario: A fourth pick
- **GIVEN** three cards are picked in a three-card fan
- **WHEN** a fourth pick is sent
- **THEN** it is rejected and the picks are unchanged

#### Scenario: Picks survive a reload
- **GIVEN** two cards are picked
- **WHEN** the conversation is reopened
- **THEN** the same two cards are shown as picked

#### Scenario: Early reveal
- **GIVEN** two cards are picked in a three-card fan
- **WHEN** a reveal is sent
- **THEN** it is rejected and the fan stays open

### Requirement: Revealing deals the spread
Revealing SHALL deal the picked cards, in the order picked, into the spread's fixed positions with the orientations already decided, and SHALL draw the teller's signature card as for any reading. The dealt spread SHALL follow the tarot spread rules (distinct cards, upright or reversed, fixed positions), be saved with the fan message, and be shown there.

#### Scenario: Pick order sets positions
- **GIVEN** the user picked cards in the order C, A, B in a three-card fan
- **WHEN** the user reveals
- **THEN** C is past, A is present and B is future

#### Scenario: Orientation is not re-rolled
- **WHEN** a picked card is revealed
- **THEN** its orientation is the one decided when the fan was laid out

#### Scenario: Signature card
- **GIVEN** Mira's definition has an action card
- **WHEN** the user reveals her fan
- **THEN** an action card distinct from the dealt cards is shown with the spread

#### Scenario: Reading persists
- **WHEN** a conversation with a revealed fan is reopened
- **THEN** the dealt spread and signature card are shown on the fan message

### Requirement: Interpretation follows the reveal
After the reveal, the teller SHALL interpret the dealt reading in a separate reply, streamed like any teller reply, receiving the reading as immutable reference with her signature card. If the interpretation fails, the reveal SHALL stand and the error SHALL be reported.

#### Scenario: Mira interprets the reveal
- **WHEN** the user reveals a three-card fan
- **THEN** Mira's reply streams and is saved as a message after the fan message
- **AND** it interprets exactly the dealt cards

#### Scenario: Interpretation fails
- **WHEN** the model call fails after a reveal
- **THEN** the cards stay revealed, the error is shown, and no partial reply is saved

### Requirement: Interactions are validated events
An interaction SHALL be a request naming a conversation, a message and an action (pick, unpick or reveal). The backend SHALL check it against the message's saved state, apply a repeated identical request without a further change, and reject any other request that doesn't fit with no change. Interactions SHALL NOT be saved as user messages and SHALL NOT feed routing or memory extraction.

#### Scenario: Reveal twice
- **GIVEN** a fan has been revealed
- **WHEN** a second reveal is sent
- **THEN** it is rejected and no second interpretation is made

#### Scenario: Pick on a set-aside or revealed fan
- **WHEN** a pick is sent for a fan that is set aside or revealed
- **THEN** it is rejected and nothing changes

#### Scenario: Unknown message
- **WHEN** an interaction names a message that is not a fan in that conversation
- **THEN** it is rejected

#### Scenario: Interactions are not chat
- **WHEN** the user picks and reveals cards
- **THEN** no user message is added to the conversation
- **AND** memory extraction receives nothing from the interactions

### Requirement: Accessible fan
Each fan card SHALL be a keyboard-operable control whose accessible name gives its place in the fan and whether it is picked. The number picked out of the number needed SHALL be shown. Reveal SHALL be a labelled control available only with the right number of picks. The reveal animation SHALL be skipped when the user prefers reduced motion.

#### Scenario: Keyboard use
- **WHEN** the user tabs to a fan card and presses Enter or Space
- **THEN** the card is picked or unpicked

#### Scenario: Names say the state
- **WHEN** assistive technology reads a fan card
- **THEN** it reports its place (for example "card 4 of 9"), that it is face-down, and whether it is picked

#### Scenario: Reduced motion
- **GIVEN** the user prefers reduced motion
- **WHEN** the cards are revealed
- **THEN** they appear without the flip animation

### Requirement: Traced interactions
Each interaction SHALL produce a span recording the kind, the teller id, the action and the outcome. A span SHALL NOT contain card names, orientations, meanings or message text.

#### Scenario: Reveal is traced
- **WHEN** a fan is revealed
- **THEN** a span records kind "card-fan", the teller id, action "reveal" and an outcome
- **AND** it contains no card identities
