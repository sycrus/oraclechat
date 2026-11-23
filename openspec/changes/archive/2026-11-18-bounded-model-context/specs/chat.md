## ADDED Requirements

### Requirement: Bounded teller history

The conversation history sent to a teller SHALL be limited to the newest messages that fit `HISTORY_TOKEN_BUDGET` (default 8,000 estimated tokens). The newest user message SHALL always be included. When earlier messages are omitted, the history SHALL begin with an omission marker. Teller instructions, consented memories and the tarot draw SHALL NOT count against or be cut by this budget.

#### Scenario: Long conversation stays in budget
- **WHEN** a conversation has 25 turns and the user sends another message
- **THEN** the teller's history fits the budget, includes the newest message, and starts with the omission marker
- **AND** the teller's persona instructions are unchanged
