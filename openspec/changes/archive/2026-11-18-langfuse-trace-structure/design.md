## Context

`observability/otel.ts` starts a `NodeSDK` with one `SimpleSpanProcessor`. `withSpan(name, attrs, fn)` uses `tracer.startActiveSpan`, so a span opened inside another span's callback becomes its child. Today only these spans exist, and none is opened inside another:
- `oracle.agent.run` (`runLocalAgent` and `streamLocalAgent`)
- `oracle.orchestration.rank`, which opens after the ranker's `runLocalAgent` call has returned
- `oracle.orchestration.participation`

As a result, every span is a root span, so Langfuse shows each one as a separate trace.

Langfuse's OTLP ingestion maps:
- `langfuse.session.id` (or `session.id`) on the root span to the trace's session;
- `gen_ai.request.model` to the observation's model;
- `gen_ai.usage.*` to token usage;
- `langfuse.observation.type` to the observation type.

The task list includes verifying the exact behavior against a live trace.

## Decision

- **Turn root.** Wrap the body of `ChatService.sendMessage` (after input validation) in `withSpan("oracle.chat.turn", …)`. Attributes:
  - `langfuse.session.id`: the conversation ID, an opaque UUID that is not content;
  - `langfuse.trace.name`: `"oracle.chat.turn"`;
  - `oracle.turn.teller_count`;
  - `oracle.turn.spread`.
- **Teller replies.** Wrap each teller's stream-and-persist step in `withSpan("oracle.teller.reply", …)` with `oracle.teller.id` and `oracle.teller.signature_position`. Run memory extraction in `oracle.memory.extract`. These nest under the turn because `startActiveSpan` propagates context through `await`.
- **Generation attributes.** In `runtime.ts`, both agent-run spans set:
  - `langfuse.observation.type = "generation"`;
  - `gen_ai.system = "ollama"`;
  - `gen_ai.request.model = config.model`;
  - after the run, `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`, only when the SDK result exposes usage.

  The agent's name is added as `oracle.agent.name`. Teller names are not personal data.
- **Rank span.** Move the `runLocalAgent` call and validation inside the `oracle.orchestration.rank` callback, so the model call is a child and the span covers the full rank time.
- **Processors.** `buildExporter` also returns the processor to use: a `BatchSpanProcessor` for `langfuse-otlp` and a `SimpleSpanProcessor` for `console`. The server already calls `shutdownTelemetry`, which flushes the batch; the tasks verify that.
- **Cleanup.** Delete `langfuse.client.ts` and remove `langfuse` from `backend/agent/package.json`. Nothing imports it.

Rejected:
- The `langfuse` SDK's own tracing client. It would bypass OTel (ADR-0004) and duplicate spans.
- Sending input/output as span attributes, which would break the no-content rule.
- A custom session ID. The conversation UUID already identifies the session and holds no personal data.

## Verification

Test-first, using the in-memory exporter pattern from `tests/runtime/tracing.test.ts`:
- A `ChatService` group turn yields exactly one root span (`oracle.chat.turn`) carrying `langfuse.session.id`. The rank, participation, both teller-reply and memory spans are its descendants.
- The ranker's model call is a child of `oracle.orchestration.rank`.
- Agent-run spans carry `gen_ai.request.model` and `langfuse.observation.type = "generation"`.
- No span attribute contains the user message, prompt or reply text. The test fixture uses distinctive strings and asserts they are absent.
- `buildExporter` selects a batch processor for Langfuse and a simple processor for the console.

Then run a live turn and check in Langfuse Cloud that it shows one trace with a session and nested generations.

## ADR alignment

- ADR-0004: OpenTelemetry stays primary, and Langfuse receives only privacy-filtered OTel data. The added attributes are opaque IDs, counts, model names and token counts, with no prompts, messages, memory or output. No OpenAI tracing is enabled.
- ADR-0002: tracing describes the local Ollama provider without changing provider selection.
- ADR-0003: spans follow the application-owned orchestration steps without altering them.
- ADR-0007: single-user, so no user ID is attached.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0007
