## ADDED Requirements

### Requirement: Structured turn traces

Each chat turn SHALL produce one root span (`oracle.chat.turn`) whose descendants include ranking, participation, each teller reply with its model call, and memory extraction. The root span SHALL carry the conversation ID as the Langfuse session ID. Model-call spans SHALL be marked as generations and carry the configured model name and, when available, token usage. These spans SHALL NOT carry prompts, user messages, memory content or model output.

#### Scenario: One group turn is one trace
- **WHEN** a two-teller turn completes
- **THEN** exactly one root span is recorded for the turn
- **AND** the rank, participation, both teller-reply and memory spans are its descendants

#### Scenario: Turns group by conversation
- **WHEN** two turns are sent in the same conversation
- **THEN** both root spans carry the same `langfuse.session.id`

#### Scenario: Model calls are generations without content
- **WHEN** a teller's model call is traced
- **THEN** its span carries `gen_ai.request.model` and the generation observation type
- **AND** no span attribute contains the user message, prompt or reply text

#### Scenario: Langfuse export is batched
- **WHEN** Langfuse export is configured
- **THEN** spans are exported through a batch processor and flushed on shutdown

### Requirement: No machine details in exported traces

Exported spans SHALL carry only the service name and telemetry SDK identity as resource attributes. Host names, operating-system user, process paths, command lines and environment-derived resources SHALL NOT be auto-detected.

#### Scenario: Resource detection is off
- **WHEN** telemetry is initialised
- **THEN** resource auto-detection is disabled and only `service.name` and `telemetry.sdk.*` are present on exported spans
