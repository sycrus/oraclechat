## Context

`observability/otel.ts` exposes `buildExporter(env)`, which returns one `{ name, exporter, processor }`: Langfuse OTLP with a batch processor when Langfuse credentials are set, otherwise the console. `NodeSDK` receives that single processor.

LangSmith ingests OTLP/HTTP traces at `<api>/otel/v1/traces`; the EU API is `https://eu.api.smith.langchain.com`. It authenticates with `x-api-key` and chooses the project with `Langsmith-Project`. It maps:
- `langsmith.span.kind` (`llm`, `chain`, …) to run type;
- `langsmith.metadata.thread_id` (or `session_id`/`conversation_id` metadata) to the thread. Note that `langsmith.trace.session_id` is the *project* ID, not a thread: an unknown value makes the endpoint reject the whole batch with 404 (found during live verification);
- `gen_ai.request.model` to the model;
- `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens` to token usage;
- `gen_ai.system` to the provider.

LangSmith drops a span whose parent was never exported. Every Oracle span is exported to every configured destination, so all parents are present.

## Decision

- **Multiple exporters.** Replace `buildExporter` with `buildExporters(env)`, which returns a list:
  - Langfuse when `LANGFUSE_BASEURL`, `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set;
  - LangSmith when `LANGSMITH_API_KEY` is set;
  - the console only when the list would otherwise be empty.

  Each remote exporter gets its own `BatchSpanProcessor`, `NodeSDK` receives all processors, and the startup log names every exporter.
- **LangSmith exporter.**
  - URL: `${LANGSMITH_ENDPOINT ?? "https://api.smith.langchain.com"}/otel/v1/traces`, with any trailing slash stripped.
  - Headers: `x-api-key` and `Langsmith-Project: LANGSMITH_PROJECT ?? "oracle"`.
- **Attributes.**
  - The turn root adds `langsmith.metadata.thread_id` (the conversation UUID) and `langsmith.span.kind = "chain"`.
  - Model-call spans add `langsmith.span.kind = "llm"`.

  The existing `gen_ai.*` attributes serve both tools. None of these carry content.

Rejected:
- The `langsmith` SDK `traceable` wrapper, which would bypass OTel (ADR-0004).
- An OTel Collector to fan out. It would mean one more process to run on a single-user machine (ADR-0007).

## Verification

Test-first:
- `buildExporters` returns Langfuse and LangSmith when both are configured, either one alone, or the console when neither is. Remote exporters use batch processors.
- With a fake LangSmith server, a flushed span is POSTed to `/otel/v1/traces` with the `x-api-key` and `Langsmith-Project` headers. A custom `LANGSMITH_ENDPOINT` is honoured.
- The turn root carries `langsmith.metadata.thread_id` and kind `chain`, and model-call spans carry kind `llm`.

Then run a live turn with a real key and confirm in LangSmith that the run tree, thread, model and token usage appear without content.

## ADR alignment

- ADR-0004: LangSmith is one of the optional destinations ADR-0004 names. It receives the same privacy-filtered OTel spans, with no prompts, messages, memory or output, and no OpenAI tracing.
- ADR-0002: no change to model or provider selection.
- ADR-0007: single-user, no collector or extra service; exporters are configured by environment variables.

ADRs reviewed: ADR-0002, ADR-0004, ADR-0007
