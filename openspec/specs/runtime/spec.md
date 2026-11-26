## Purpose

Defines the runtime boundary used to serve Oracle and call language models: local by default with no paid API key, and optionally hosted teller replies (ADR-0014).

### Requirement: Local model is the default

The application SHALL use the configured Ollama OpenAI-compatible endpoint by default. It SHALL NOT fall back to a hosted model when local inference fails, nor to the local model when a hosted call fails. A hosted model SHALL be used only for teller replies, and only when `HOSTED_BASE_URL`, `HOSTED_API_KEY` and `HOSTED_MODEL` are all configured; a partial configuration SHALL stop startup. Routing, memory extraction and embeddings SHALL always use the local endpoint.

#### Scenario: Local model call needs no paid API key

- GIVEN the local runtime is configured with an Ollama URL and model name
- AND no hosted provider is configured
- WHEN an agent run is made
- THEN the request is sent to the configured local endpoint
- AND no request is sent to a hosted endpoint

#### Scenario: Local inference failure does not call a hosted model

- GIVEN the local endpoint is unavailable
- WHEN an agent run is made in the default local profile
- THEN the run returns a local-provider error
- AND no hosted provider is used as fallback

### Requirement: Service health endpoint

The agent service SHALL expose `GET /health` and return a successful status response while the HTTP process is running.

#### Scenario: Service reports healthy

- GIVEN the agent service is running
- WHEN a client requests `GET /health`
- THEN the service returns HTTP 200 with `{"status":"ok"}`

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

### Requirement: No machine details in exported traces

Exported spans SHALL carry only the service name and telemetry SDK identity as resource attributes. Host names, operating-system user, process paths, command lines and environment-derived resources SHALL NOT be auto-detected.

#### Scenario: Resource detection is off
- **WHEN** telemetry is initialised
- **THEN** resource auto-detection is disabled and only `service.name` and `telemetry.sdk.*` are present on exported spans

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

### Requirement: Controlled model thinking

Structured local-model tasks (relevance ranking and memory extraction) SHALL run with model thinking disabled. Teller replies SHALL run with thinking disabled unless `TELLER_THINKING=true`. Disabling thinking SHALL be requested through the local OpenAI-compatible endpoint (`reasoning_effort: "none"`) without calling any hosted provider.

#### Scenario: Ranker runs without thinking
- **WHEN** a group message is ranked
- **THEN** the local model request carries `reasoning_effort: "none"`

#### Scenario: Teller thinking is configurable
- **WHEN** `TELLER_THINKING` is unset
- **THEN** teller requests carry `reasoning_effort: "none"`
- **AND** when it is `true`, teller requests use the model's default thinking

### Requirement: Supervised local production services

On the owner's PC, Oracle SHALL start at logon without open terminals: a supervisor SHALL keep PostgreSQL available, confirm Ollama has the chat and embedding models, run the built backend on `127.0.0.1:4000` and the built frontend on `127.0.0.1:3000`, and restart any of them that stops. Remote access SHALL be tailnet-only through Tailscale serve. Neither web port SHALL listen on non-loopback interfaces.

#### Scenario: Oracle is up after login
- **WHEN** the owner logs in to Windows
- **THEN** Postgres, the backend and the frontend become available without manual steps
- **AND** the backend and frontend listen only on 127.0.0.1

#### Scenario: A crashed component is restarted
- **WHEN** the backend process stops while the supervisor runs
- **THEN** it is running again within about 30 seconds

#### Scenario: Missing build
- **WHEN** the supervisor starts and a build output is missing
- **THEN** it reports that `pnpm build` must run first instead of starting a broken service

### Requirement: Optional hosted teller replies

When a hosted provider is fully configured, teller replies SHALL stream from that OpenAI-compatible endpoint with its API key, without a local reasoning setting. A failed hosted reply SHALL end the turn with an error and SHALL NOT be retried locally. The API key SHALL NOT appear in API responses, logs or traces. Reply spans SHALL record whether the reply was hosted.

#### Scenario: Hosted replies, local routing
- **WHEN** a hosted provider is configured and the user sends a message
- **THEN** each teller reply is requested from the hosted endpoint with the configured key
- **AND** the routing call goes to the local endpoint

#### Scenario: Partial configuration
- **WHEN** only some hosted variables are set
- **THEN** the backend refuses to start and names the missing variables without showing the key

#### Scenario: Hosted failure
- **WHEN** a hosted reply fails
- **THEN** the turn ends with an error event
- **AND** no local reply is attempted

#### Scenario: Hosted replies are visible
- **WHEN** hosted replies are configured
- **THEN** the UI shows "Hosted model" instead of "Local models"
