# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
