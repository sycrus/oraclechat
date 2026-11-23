## MODIFIED Requirements

### Requirement: Privacy-filtered orchestration traces

OpenTelemetry SHALL record relevance scores, matched categories, and the ordered responder teller IDs. The ranking span SHALL enclose the ranker's model call. Traces SHALL NOT include raw message text, prompts, model output, or personal memory content by default.

#### Scenario: Ranking is observable without message content
- **WHEN** a group message is ranked and responders are ordered
- **THEN** scores, categories, and ordered teller IDs are available
- **AND** message and memory text are absent

#### Scenario: Ranker model call nests under the ranking span
- **WHEN** a group message is ranked
- **THEN** the ranker's model-call span is a child of `oracle.orchestration.rank`
