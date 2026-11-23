# Spec Delta

## MODIFIED Requirements

### Requirement: Card fan enabled per teller
A tarot teller's definition MAY enable the card fan and SHALL then give the invitation text shown with it. A teller definition SHALL be rejected if a non-tarot teller enables the fan or a teller enables it without invitation text. A teller without the fan, and every turn sent as a call message, SHALL keep giving immediate readings.

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
- **THEN** the casting is shown at once

#### Scenario: Calls keep immediate readings
- **GIVEN** a call with Mira
- **WHEN** the owner asks for a reading in the call
- **THEN** the spread is drawn and shown in the call at once, with no fan

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

## ADDED Requirements

### Requirement: Coin toss enabled per teller
An I Ching teller's definition MAY enable the coin toss and SHALL then give the invitation text shown with it. A teller definition SHALL be rejected if a non-I-Ching teller enables the coin toss or a teller enables it without invitation text. A teller without the coin toss, and every turn sent as a call message, SHALL keep giving immediate castings.

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

#### Scenario: Calls keep immediate castings
- **GIVEN** a call with Sage
- **WHEN** the owner asks for a reading in the call
- **THEN** the casting is drawn and shown as before, with no coin toss

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
After the sixth toss, the teller SHALL interpret the completed reading in a separate reply, streamed like any teller reply, receiving it as immutable reference and told that the user cast the coins themselves. If the interpretation fails, the revealed cast SHALL stand and the error SHALL be reported.

#### Scenario: Sage interprets the cast
- **WHEN** the user tosses the sixth line
- **THEN** Sage's reply streams and is saved as a message after the toss message
- **AND** it interprets exactly the cast hexagram, changing lines and relating hexagram

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
