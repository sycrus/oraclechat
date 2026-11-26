## MODIFIED Requirements

### Requirement: Provider-neutral tracing

Application operations SHALL use OpenTelemetry spans. OpenAI Agents SDK trace export SHALL be disabled by default, and SHALL be enabled only for hosted teller replies under "Opt-in OpenAI traces for hosted replies". Trace attributes SHALL omit prompts, user messages, memory content, and model outputs unless the owner turns on trace content (see "Opt-in trace content"). Optional configured Langfuse export MAY receive the same OpenTelemetry data. When Langfuse export is configured, completed spans SHALL be serialized and sent to the configured OTLP endpoint, and startup SHALL report which exporter is active.

#### Scenario: Model run has an OpenTelemetry span without content
- **WHEN** an agent run containing a user message is traced and trace content is off
- **THEN** an OpenTelemetry span is created for the run
- **AND** its attributes contain no prompt, message, memory, or output content
- **AND** the run is not exported to OpenAI tracing

#### Scenario: Configured Langfuse export delivers spans
- **WHEN** Langfuse credentials are configured and an application span ends
- **THEN** the span is posted to `<LANGFUSE_BASEURL>/api/public/otel/v1/traces` with Basic authentication
- **AND** the export reports success instead of a serialization error

## ADDED Requirements

### Requirement: Opt-in OpenAI traces for hosted replies

When `OPENAI_TRACES` is `1` or `true` (case-insensitive), each hosted teller reply SHALL create one Agents SDK trace named `Oracle teller reply`. The trace SHALL be exported to OpenAI with the hosted API key set for that run, and SHALL carry the teller name and the OpenTelemetry trace ID as metadata. The switch SHALL require hosted replies whose base URL is on `api.openai.com`; otherwise the backend SHALL refuse to start. Local model runs SHALL NOT create Agents SDK traces. OpenAI traces SHALL include prompts and replies only when trace content is also on. Pending traces SHALL be flushed on shutdown.

#### Scenario: Off by default
- **WHEN** `OPENAI_TRACES` is unset or not `1`/`true`
- **THEN** no hosted or local run creates an Agents SDK trace

#### Scenario: Hosted reply traced to OpenAI
- **WHEN** the switch is on and a hosted teller reply completes
- **THEN** one `Oracle teller reply` trace is created with the hosted key as its export key
- **AND** its metadata carries the OpenTelemetry trace ID of the reply's run span

#### Scenario: Local runs stay untraced
- **WHEN** the switch is on and a local routing or memory call runs
- **THEN** no Agents SDK trace is created for it

#### Scenario: Content follows TRACE_CONTENT
- **WHEN** the switch is on and `TRACE_CONTENT` is off
- **THEN** the trace's spans carry no prompt or reply text

#### Scenario: Needs hosted OpenAI replies
- **WHEN** the switch is on without hosted replies, or with a `HOSTED_BASE_URL` not on `api.openai.com`
- **THEN** the backend refuses to start and says why
