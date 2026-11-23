## ADDED Requirements

### Requirement: Conversational reply length

Teller instructions SHALL ask for chat-style replies: about 50 words at most (1–3 short sentences) on turns without cards, and about 120 words in total on reading turns, without headings, bullet lists or per-card sections, and with at most one question.

#### Scenario: Casual message
- **WHEN** the user sends a message without cards
- **THEN** each teller's instructions and turn note ask for 1–3 short sentences

#### Scenario: Reading
- **WHEN** the user draws three cards
- **THEN** each teller's turn context asks for a reply of about 120 words that weaves the cards together
