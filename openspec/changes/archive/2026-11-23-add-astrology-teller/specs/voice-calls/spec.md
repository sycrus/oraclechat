# Spec Delta

## ADDED Requirements

### Requirement: Astrology readings in a call
In a call with an astrology teller, a reading SHALL use the saved birth details and be computed at once, saved to the conversation, and shown in the overlay as a note pointing to the chat. With no saved details, no chart SHALL be computed and no form SHALL appear in the overlay; the teller SHALL say the details are needed and can be added in the chat.

#### Scenario: Astra is callable
- **GIVEN** a 1:1 conversation with Astra, whose definition enables calls
- **WHEN** the chat header renders
- **THEN** a video call button is shown and the call loads her model

#### Scenario: Reading in a call with saved details
- **GIVEN** a call with Astra and saved birth details
- **WHEN** the owner asks for a reading
- **THEN** the chart is saved to the conversation and the overlay shows "Astra gave a reading — see chat"

#### Scenario: Reading in a call without details
- **GIVEN** a call with Astra and no saved birth details
- **WHEN** the owner asks for a reading
- **THEN** no chart is saved, no form is shown, and Astra says the details can be added in the chat
