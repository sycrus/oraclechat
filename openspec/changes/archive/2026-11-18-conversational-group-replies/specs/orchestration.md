## MODIFIED Requirements

### Requirement: Response ordering and threshold

In a two-teller conversation both tellers SHALL respond to every user message. Relevance scores SHALL determine response order only: the higher-scored teller SHALL respond first. If scores tie, the teller who spoke least recently SHALL go first. Responses SHALL stream in that order.

#### Scenario: Both tellers respond regardless of score
- **WHEN** scores are 0.82 and 0.10
- **THEN** both tellers respond, the 0.82 teller first

#### Scenario: Tie uses least-recently-spoken
- **WHEN** both tellers have equal scores
- **THEN** the teller with the earlier last response goes first

### Requirement: Privacy-filtered orchestration traces

OpenTelemetry SHALL record relevance scores, matched categories, and the ordered responder teller IDs. Traces SHALL NOT include raw message text, prompts, model output, or personal memory content by default.

#### Scenario: Ranking is observable without message content
- **WHEN** a group message is ranked and responders are ordered
- **THEN** scores, categories, and ordered teller IDs are available
- **AND** message and memory text are absent
