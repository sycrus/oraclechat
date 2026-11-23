# interactive-readings Specification

## Purpose

Defines interactive reading messages: a closed, app-owned catalog of message kinds the user can act on, with hidden state kept on the server and validated interaction events. The first kind is the tarot card fan, where the user picks face-down cards for a teller to interpret; the second is the coin toss, where the user throws the coins for an I Ching cast.

## Requirements

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
A tarot teller's definition MAY enable the card fan and SHALL then give the invitation text shown with it. A teller definition SHALL be rejected if a non-tarot teller enables the fan or a teller enables it without invitation text. A teller without the fan SHALL keep giving immediate readings. A fan-enabled teller SHALL lay out the fan in call turns as in the chat, and SHALL speak the invitation as the call reply.

#### Scenario: Mira has the fan
- **WHEN** the teller definitions load
- **THEN** Mira's definition enables the fan with an invitation

#### Scenario: Fan on a non-tarot teller
- **WHEN** a definition for an I Ching teller enables the card fan
- **THEN** the definition is rejected

#### Scenario: Tarot teller without the fan
- **GIVEN** a tarot teller whose definition has no fan
- **WHEN** the teller is asked for a reading in chat
- **THEN** the spread is drawn and shown at once, as before

#### Scenario: Sage still casts at once
- **GIVEN** Sage's definition has no coin toss
- **WHEN** Sage is asked for a reading
- **THEN** the casting is shown at once, as before

#### Scenario: Calls lay out the fan
- **GIVEN** a call with Mira
- **WHEN** the owner asks for a reading in the call
- **THEN** a fan message is saved with her invitation and no dealt cards
- **AND** the invitation is streamed as a spoken sentence

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
After the reveal, the teller SHALL interpret the dealt reading in a separate reply, streamed like any teller reply, receiving the reading as immutable reference with her signature card. When the reveal carries the call flag, the reply SHALL be a call reply: spoken sentences with expressions, accepted only in a one-to-one conversation with a callable teller. If the interpretation fails, the reveal SHALL stand and the error SHALL be reported.

#### Scenario: Mira interprets the reveal
- **WHEN** the user reveals a three-card fan
- **THEN** Mira's reply streams and is saved as a message after the fan message
- **AND** it interprets exactly the dealt cards

#### Scenario: Reveal in a call
- **WHEN** the owner reveals a fan from a call with Mira
- **THEN** her interpretation streams as spoken sentences
- **AND** the saved reply has no expression tags

#### Scenario: Call flag on a group conversation
- **WHEN** an interaction with the call flag is sent for a conversation with Mira and Sage
- **THEN** it is rejected and nothing changes

#### Scenario: Interpretation fails
- **WHEN** the model call fails after a reveal
- **THEN** the cards stay revealed, the error is shown, and no partial reply is saved

### Requirement: Interactions are validated events
An interaction SHALL be a request naming a conversation, a message and an action (pick, unpick, reveal or toss). The backend SHALL check it against the message's saved state, apply a repeated identical request without a further change, and reject any other request that doesn't fit with no change. Interactions SHALL NOT be saved as user messages and SHALL NOT feed routing or memory extraction.

#### Scenario: Reveal twice
- **GIVEN** a fan has been revealed
- **WHEN** a second reveal is sent
- **THEN** it is rejected and no second interpretation is made

#### Scenario: Pick on a set-aside or revealed fan
- **WHEN** a pick is sent for a fan that is set aside or revealed
- **THEN** it is rejected and nothing changes

#### Scenario: Unknown message
- **WHEN** an interaction names a message that is not an interactive message in that conversation
- **THEN** it is rejected

#### Scenario: Interactions are not chat
- **WHEN** the user picks and reveals cards, or tosses coins
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

### Requirement: Coin toss enabled per teller
An I Ching teller's definition MAY enable the coin toss and SHALL then give the invitation text shown with it. A teller definition SHALL be rejected if a non-I-Ching teller enables the coin toss or a teller enables it without invitation text. A teller without the coin toss SHALL keep giving immediate castings. A toss-enabled teller SHALL lay out the coin toss in call turns as in the chat, and SHALL speak the invitation as the call reply.

#### Scenario: Sage has the coin toss
- **WHEN** the teller definitions load
- **THEN** Sage's definition enables the coin toss with an invitation

#### Scenario: Coin toss on a non-I-Ching teller
- **WHEN** a definition for a tarot teller enables the coin toss
- **THEN** the definition is rejected

#### Scenario: I Ching teller without the coin toss
- **GIVEN** an I Ching teller whose definition has no coin toss
- **WHEN** the teller is asked for a reading in chat
- **THEN** the casting is drawn and shown at once, as before

#### Scenario: Calls lay out the coin toss
- **GIVEN** a call with Sage
- **WHEN** the owner asks for a reading in the call
- **THEN** a coin toss message is saved with his invitation and no tossed lines
- **AND** the invitation is streamed as a spoken sentence

### Requirement: Laying out the coin toss
When a toss-enabled I Ching teller is asked for a reading in the chat, the application SHALL give it as a coin toss: a message from that teller whose text is the invitation, with six pre-cast throws kept on the server and no lines shown. No model call SHALL write the invitation. Only one coin toss per teller SHALL be open at a time; an earlier open toss SHALL be set aside, its unthrown throws discarded, and a new toss laid out.

#### Scenario: Sage is asked for a reading
- **WHEN** the user asks Sage for a reading in chat
- **THEN** Sage's message shows his invitation and an empty cast with six throws to go

#### Scenario: Both tellers asked
- **WHEN** the user asks both Mira and Sage for a reading
- **THEN** Mira lays out a fan and Sage lays out a coin toss, and neither teller's reply waits for the other

#### Scenario: A new request closes the open toss
- **GIVEN** Sage's coin toss is open and unfinished
- **WHEN** the user asks Sage for another reading
- **THEN** the earlier toss is shown as set aside and can no longer be tossed
- **AND** a new toss is laid out

### Requirement: Throws stay hidden until tossed
The application SHALL decide all six throws when the toss is laid out and keep the unthrown ones on the server. They SHALL NOT appear in any response, stream event, saved-conversation payload sent to the browser, or teller input until tossed. A thrown line's value SHALL be visible to the browser from the moment it is tossed.

#### Scenario: Toss payload carries no future throws
- **WHEN** the browser receives a laid-out or partly cast toss
- **THEN** it contains only the lines tossed so far, with their values, and no unthrown values

#### Scenario: Reload mid-cast
- **GIVEN** two lines have been tossed
- **WHEN** the conversation is reopened
- **THEN** the same two lines are shown and four throws are still to go, with no future values in the payload

#### Scenario: Chatting while a toss is open
- **GIVEN** a coin toss is open
- **WHEN** the user sends another message
- **THEN** no teller's input contains any unthrown throw

### Requirement: Tossing reveals lines
Each toss SHALL reveal exactly one pre-cast throw, building the hexagram bottom to top in cast order, shown with the three coin faces the throw's value stands for. A toss SHALL be accepted only while the cast is open, SHALL carry the number of lines already tossed, and SHALL be applied only when that number still matches, so a repeated or out-of-date toss changes nothing. The lines SHALL be saved as they are tossed.

#### Scenario: Lines build bottom to top
- **GIVEN** a laid-out coin toss
- **WHEN** the user tosses three times
- **THEN** three lines are shown in cast order, each with its coin faces, and three throws remain

#### Scenario: A repeated toss
- **GIVEN** two lines have been tossed
- **WHEN** a toss naming two lines already tossed arrives twice
- **THEN** the first advances to three lines and the second changes nothing

#### Scenario: An out-of-date toss
- **GIVEN** two lines have been tossed
- **WHEN** a toss arrives naming one line tossed
- **THEN** it is rejected and the cast is unchanged

#### Scenario: A toss on a finished or set-aside cast
- **WHEN** a toss is sent for a cast that is revealed or set aside
- **THEN** it is rejected and nothing changes

#### Scenario: Tosses survive a reload
- **GIVEN** four lines have been tossed
- **WHEN** the conversation is reopened
- **THEN** the same four lines are shown and two throws remain

### Requirement: The sixth toss completes the cast
When the sixth line is tossed, the cast SHALL be complete: the application SHALL form the reading from the six lines by the app-owned casting rules (primary hexagram, changing lines, relating hexagram when any line changes), set the cast's state to revealed, and save the reading with the toss message, where it SHALL be shown. The cast's values SHALL NOT change at completion.

#### Scenario: Completion forms the reading
- **GIVEN** five lines have been tossed
- **WHEN** the user tosses the sixth time
- **THEN** the cast is revealed, the reading is saved with the message and shown there, and any changing lines give a relating hexagram

#### Scenario: A cast without changing lines
- **WHEN** all six throws are steady (7 or 8)
- **THEN** the revealed reading names the primary hexagram and no relating hexagram

#### Scenario: The reading persists
- **WHEN** a conversation with a revealed cast is reopened
- **THEN** the cast and its reading are shown on the toss message

### Requirement: Interpretation follows the completed cast
After the sixth toss, the teller SHALL interpret the completed reading in a separate reply, streamed like any teller reply, receiving it as immutable reference and told that the user cast the coins themselves. When the sixth toss carries the call flag, the reply SHALL be a call reply: spoken sentences with expressions, accepted only in a one-to-one conversation with a callable teller. If the interpretation fails, the revealed cast SHALL stand and the error SHALL be reported.

#### Scenario: Sage interprets the cast
- **WHEN** the user tosses the sixth line
- **THEN** Sage's reply streams and is saved as a message after the toss message
- **AND** it interprets exactly the cast hexagram, changing lines and relating hexagram

#### Scenario: Sixth toss in a call
- **WHEN** the owner tosses the sixth line from a call with Sage
- **THEN** his interpretation streams as spoken sentences

#### Scenario: Interpretation fails
- **WHEN** the model call fails after the sixth toss
- **THEN** the cast stays revealed, the error is shown, and no partial reply is saved

### Requirement: Accessible coin toss
The toss SHALL be a labelled keyboard-operable control, disabled when a toss is not allowed. The number of lines tossed out of six SHALL be announced, and each tossed line SHALL be described (solid or broken, changing or steady, its place in the cast). Animations SHALL be skipped when the user prefers reduced motion.

#### Scenario: Keyboard use
- **WHEN** the user tabs to the toss control and presses Enter or Space
- **THEN** one throw is cast

#### Scenario: The count is announced
- **GIVEN** three lines have been tossed
- **WHEN** another toss lands
- **THEN** the cast reports four of six lines tossed

#### Scenario: Lines say their state
- **WHEN** assistive technology reads a tossed line
- **THEN** it reports solid or broken, changing or steady, and its place (for example "line 2 of 6")

#### Scenario: Reduced motion
- **GIVEN** the user prefers reduced motion
- **WHEN** a toss lands
- **THEN** the line appears without the coin animation

### Requirement: Compact coin toss card
An open coin toss SHALL be shown as one card in the teller's message. The card SHALL show:
- a header with six progress squares and "N of 6"
- one row per line from line 6 at the top to line 1 at the bottom, each with the line as tossed, the three coin faces with the line's value, and the line it becomes
- a full-width toss button

Untossed lines SHALL show as empty outlines. The newest line SHALL be highlighted, and changing lines and their values SHALL use the accent colour. The explanation of how coins count SHALL be hidden behind a "?" button that toggles it.

#### Scenario: Partly cast
- **GIVEN** four lines have been tossed
- **WHEN** the toss card is shown
- **THEN** rows 1 to 4 show their lines, coins and values, rows 5 and 6 are empty outlines, and the header reads "4 of 6"

#### Scenario: Help is folded away
- **WHEN** the toss card is first shown
- **THEN** the coin explanation is hidden
- **AND** pressing "?" shows it, and pressing it again hides it
