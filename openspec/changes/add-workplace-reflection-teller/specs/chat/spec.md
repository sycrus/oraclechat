## MODIFIED Requirements

### Requirement: MVP teller conversations
The application SHALL allow a user to start a one-to-one chat with Mira, Sage, Astra or Milo, or a group chat with any two of them. Every chat message SHALL identify its sender. A one-to-one chat SHALL route each user message directly to its sole teller. In a group chat both tellers SHALL respond, in the order set by application-owned relevance ranking.

#### Scenario: Start a chat with Milo
- **WHEN** the user selects Milo alone, or Milo with one other teller
- **THEN** the conversation is created and Milo responds

#### Scenario: Three tellers
- **WHEN** a conversation request names any three tellers
- **THEN** it is rejected
