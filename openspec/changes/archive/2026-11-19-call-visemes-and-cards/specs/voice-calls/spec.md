## MODIFIED Requirements

### Requirement: Mouth follows the voice
While the teller speaks, the mouth SHALL take the vowel shape (`aa`, `ih`, `ou`, `ee`, `oh`) detected in the playing audio, with an opening that follows its loudness, and SHALL close when the audio is silent or finished. If vowel detection cannot start, the mouth opening SHALL follow loudness alone.

#### Scenario: Vowel shape while speaking
- **GIVEN** the teller is speaking
- **WHEN** the analysed audio is mostly an "o" vowel at speaking volume
- **THEN** the `oh` mouth shape is the strongest of the five

#### Scenario: Silence closes the mouth
- **GIVEN** the teller is speaking
- **WHEN** the audio level drops to silence
- **THEN** every mouth shape returns to closed

#### Scenario: Loud audio opens the mouth
- **WHEN** the audio level rises
- **THEN** the mouth opening increases, up to its maximum

#### Scenario: Vowel detection unavailable
- **GIVEN** the vowel analyser failed to start
- **WHEN** the teller speaks
- **THEN** the call continues, and the `aa` opening follows the audio's loudness

### Requirement: Readings during a call
If the teller draws a reading during a call turn, the reading SHALL be saved to the conversation as usual. For a tarot reading, the overlay SHALL show the drawn cards with their art, name, position and orientation, plus the teller's signature card if one was drawn, until the next reading or the end of the call. For a reading the overlay cannot show, it SHALL show a note naming how many cards were drawn and pointing to the chat.

#### Scenario: Three-card reading
- **WHEN** Mira draws a three-card reading in a call turn
- **THEN** the overlay shows the three cards with their names, positions and orientations
- **AND** the cards are in the conversation when the call ends

#### Scenario: Signature card
- **WHEN** Mira draws a one-card reading with her signature action card
- **THEN** the overlay shows both cards, the second labelled as her action card

#### Scenario: Next reading replaces the cards
- **GIVEN** the overlay shows a three-card reading
- **WHEN** Mira draws a one-card reading in a later call turn
- **THEN** only the new cards are shown

#### Scenario: Reading the overlay cannot show
- **WHEN** a call turn's reading has invalid card data
- **THEN** no cards are shown and the overlay shows "Mira gave a reading — see chat"
