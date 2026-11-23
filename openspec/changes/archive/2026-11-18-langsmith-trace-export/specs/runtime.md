## ADDED Requirements

### Requirement: Optional LangSmith trace export

When `LANGSMITH_API_KEY` is configured, the application SHALL export the same privacy-filtered OpenTelemetry spans to LangSmith's OTLP endpoint, in addition to any configured Langfuse export. The turn root SHALL carry the conversation ID as the LangSmith session ID, and model-call spans SHALL be marked as LLM runs. Without any configured destination, spans SHALL go to the console.

#### Scenario: LangSmith receives spans
- **WHEN** `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT` are set and a span ends
- **THEN** the span is posted to `<LANGSMITH_ENDPOINT>/otel/v1/traces` with `x-api-key` and `Langsmith-Project` headers

#### Scenario: Both destinations together
- **WHEN** both Langfuse and LangSmith are configured
- **THEN** every span is exported to both, each through its own batch processor

#### Scenario: Turns group into a LangSmith thread
- **WHEN** a chat turn is traced
- **THEN** its root span carries `langsmith.metadata.thread_id` set to the conversation ID
- **AND** its model-call spans carry `langsmith.span.kind = "llm"`
