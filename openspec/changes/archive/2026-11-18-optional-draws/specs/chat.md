## MODIFIED Requirements

### Requirement: Inline tarot reading

When the user chooses a spread, the application SHALL attach that fixed tarot spread to the user message and render the original illustrated cards inline. Tellers interpret the supplied draw and SHALL NOT select or change cards. The composer SHALL offer No cards, One card and Three cards, SHALL default to No cards, and SHALL reset to No cards after each send.

#### Scenario: Tarot draw appears in the conversation
- **WHEN** a user sends a message with a chosen spread
- **THEN** the spread remains visible with the conversation after reload
- **AND** selecting a card reveals its original orientation-specific meaning

#### Scenario: Draws are chosen per message
- **WHEN** the user sends a message with Three cards selected
- **THEN** the composer returns to No cards for the next message

## ADDED Requirements

### Requirement: Conversation turns without cards

On a message without a draw, tellers SHALL reply in character without interpreting or inventing cards, and MAY suggest drawing cards. They SHALL receive the conversation's most recent spread and their own most recent signature card, if any, as reference so they can expand on earlier readings.

#### Scenario: Going deeper into an earlier reading
- **WHEN** a three-card reading was drawn earlier and the user now asks "tell me more about the present card" without drawing
- **THEN** no new cards are drawn
- **AND** each teller receives the earlier spread as reference and is told not to invent new cards
