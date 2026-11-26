## MODIFIED Requirements

### Requirement: Provider-neutral tracing

Application operations SHALL use OpenTelemetry spans. OpenAI Agents SDK trace export SHALL be disabled by default. Trace attributes SHALL omit prompts, user messages, memory content, and model outputs unless the owner turns on trace content (see "Opt-in trace content"). Optional configured Langfuse export MAY receive the same OpenTelemetry data. When Langfuse export is configured, completed spans SHALL be serialized and sent to the configured OTLP endpoint, and startup SHALL report which exporter is active.

#### Scenario: Model run has an OpenTelemetry span without content
- **WHEN** an agent run containing a user message is traced and trace content is off
- **THEN** an OpenTelemetry span is created for the run
- **AND** its attributes contain no prompt, message, memory, or output content
- **AND** the run is not exported to OpenAI tracing

#### Scenario: Configured Langfuse export delivers spans
- **WHEN** Langfuse credentials are configured and an application span ends
- **THEN** the span is posted to `<LANGFUSE_BASEURL>/api/public/otel/v1/traces` with Basic authentication
- **AND** the export reports success instead of a serialization error

### Requirement: Structured turn traces

Each chat turn SHALL produce one root span (`oracle.chat.turn`) whose descendants include ranking, participation, each teller reply with its model call, and memory extraction. The root span SHALL carry the conversation ID as the Langfuse session ID. Model-call spans SHALL be marked as generations and carry the configured model name and, when available, token usage. Unless trace content is on, these spans SHALL NOT carry prompts, user messages, memory content or model output.

#### Scenario: One group turn is one trace
- **WHEN** a two-teller turn completes
- **THEN** exactly one root span is recorded for the turn
- **AND** the rank, participation, both teller-reply and memory spans are its descendants

#### Scenario: Turns group by conversation
- **WHEN** two turns are sent in the same conversation
- **THEN** both root spans carry the same `langfuse.session.id`

#### Scenario: Model calls are generations without content
- **WHEN** a teller's model call is traced and trace content is off
- **THEN** its span carries `gen_ai.request.model` and the generation observation type
- **AND** no span attribute contains the user message, prompt or reply text

#### Scenario: Langfuse export is batched
- **WHEN** Langfuse export is configured
- **THEN** spans are exported through a batch processor and flushed on shutdown

## ADDED Requirements

### Requirement: Opt-in trace content

When `TRACE_CONTENT` is `1` or `true` (case-insensitive), each model-call span SHALL record its input (the instructions and input text, as chat messages) in `langfuse.observation.input` and its returned text in `langfuse.observation.output`. Any other value, or none, SHALL leave content off. Startup SHALL log a warning while it is on. Content SHALL go to every configured trace destination; it SHALL NOT be recorded on other spans.

#### Scenario: Content recorded when turned on
- **WHEN** `TRACE_CONTENT=1` and an agent run completes
- **THEN** its span's `langfuse.observation.input` contains the instructions and the input text
- **AND** its span's `langfuse.observation.output` contains the reply

#### Scenario: Streamed replies are recorded too
- **WHEN** `TRACE_CONTENT=1` and a streamed teller reply completes
- **THEN** its span's `langfuse.observation.output` contains the full streamed text

#### Scenario: Other values keep content off
- **WHEN** `TRACE_CONTENT` is unset, empty, `0` or `yes`
- **THEN** no span attribute contains the instructions, input or reply

#### Scenario: Startup warns while content is on
- **WHEN** the backend starts with `TRACE_CONTENT=1`
- **THEN** it logs that prompts and replies are recorded in model-call spans
