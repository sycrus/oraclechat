## MODIFIED Requirements

### Requirement: Provider-neutral tracing

Application operations SHALL use OpenTelemetry spans. OpenAI Agents SDK trace export SHALL be disabled by default. Trace attributes SHALL omit prompts, user messages, memory content, and model outputs by default. Optional configured Langfuse export MAY receive the same privacy-filtered OpenTelemetry data. When Langfuse export is configured, completed spans SHALL be serialized and sent to the configured OTLP endpoint, and startup SHALL report which exporter is active.

#### Scenario: Model run has an OpenTelemetry span without content
- **WHEN** an agent run containing a user message is traced
- **THEN** an OpenTelemetry span is created for the run
- **AND** its attributes contain no prompt, message, memory, or output content
- **AND** the run is not exported to OpenAI tracing

#### Scenario: Configured Langfuse export delivers spans
- **WHEN** Langfuse credentials are configured and an application span ends
- **THEN** the span is posted to `<LANGFUSE_BASEURL>/api/public/otel/v1/traces` with Basic authentication
- **AND** the export reports success instead of a serialization error
