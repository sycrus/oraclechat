# Spec Delta

## MODIFIED Requirements

### Requirement: Signature card in the reply
When a tarot teller gives an immediate reading, `message_start` SHALL include its signature card, and the reply SHALL display it labeled by position (Action card) above the reply text, before streaming text arrives. For a reading dealt from a card fan, the signature card SHALL instead be sent and shown with the revealed reading, before the interpretation streams.

#### Scenario: Card appears when the teller starts
- **WHEN** a `message_start` event arrives for Mira giving a reading
- **THEN** Mira's action card is shown at the top of Mira's reply

#### Scenario: Card appears with the reveal
- **WHEN** the user reveals Mira's fan
- **THEN** her action card is shown with the dealt spread
- **AND** it is shown before her interpretation streams

## ADDED Requirements

### Requirement: Fan readings are dealt at the reveal
A reading dealt from a card fan SHALL be saved with the fan message at the reveal. No teller SHALL receive any card of the fan before then; after the reveal, a teller other than the fan's SHALL receive the dealt reading as reference labelled with its teller's name, as for any reading.

#### Scenario: Fan reading is Mira's reference after the reveal
- **GIVEN** Mira's fan has been revealed
- **WHEN** Sage replies in a later turn
- **THEN** Sage's input contains the dealt reading labelled as Mira's reference

#### Scenario: Unrevealed fan is not shared
- **GIVEN** Mira's fan is open
- **WHEN** Sage replies
- **THEN** Sage's input contains no card from the fan

#### Scenario: Dealt reading persists with the fan message
- **WHEN** a conversation with a revealed fan is reopened
- **THEN** the dealt reading is shown on the fan message, and the interpretation is a separate reply after it
