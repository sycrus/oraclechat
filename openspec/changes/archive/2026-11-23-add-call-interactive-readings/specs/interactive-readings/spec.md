# Spec Delta

## MODIFIED Requirements

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
