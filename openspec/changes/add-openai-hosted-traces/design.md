## Context

- `agent/runtime.ts`: `createRunner` calls `setTracingDisabled(true)` and builds every `Runner` with `tracingDisabled: true`. Both run and stream go through it.
- `@openai/agents` v0.22, checked in the installed source:
  - Importing the package registers `BatchTraceProcessor(new OpenAITracingExporter())` as the default processor.
  - `setTracingDisabled(true)` turns the global trace provider off, so no run creates a trace while it's set, whatever its own `tracingDisabled` says.
  - `RunConfig` has `workflowName`, `traceMetadata`, `traceIncludeSensitiveData` and `tracing.apiKey`.
  - The exporter uses a trace's own `tracingApiKey` before the global `setTracingExportApiKey` key.
  - `getGlobalTraceProvider().forceFlush()` flushes the batch.
- `agent/hosted.ts`: `loadHostedModelConfig` returns the hosted `LocalModelConfig`. `server.ts` calls it at startup.

## Decision

- **Config.** `loadHostedModelConfig` reads `OPENAI_TRACES` (`1`/`true`, trimmed, case-insensitive). When it's on, the function throws unless hosted replies are configured and `HOSTED_BASE_URL`'s host is `api.openai.com`, and it returns `openaiTraces: true` on the hosted config. `LocalModelConfig` gains `openaiTraces?: boolean`.
- **Runner.**
  - The global provider stays disabled until a config with `openaiTraces` has been used. After that it stays enabled, so concurrent local runs can't switch it off mid-reply.
  - Local runs keep `tracingDisabled: true` per run, so they never create traces.
  - A traced run sets `tracingDisabled: false`, `workflowName: "Oracle teller reply"`, `tracing: { apiKey: config.apiKey }`, `traceMetadata: { teller, otel_trace_id }` and `traceIncludeSensitiveData: traceContentEnabled()`.
- **Shutdown.** `shutdownTelemetry` also awaits `getGlobalTraceProvider().forceFlush()`.
- **Startup log.** `server.ts` logs that hosted teller replies are also traced to OpenAI when the switch is on.

Rejected:
- **`setTracingExportApiKey` globally.** It's simpler, but it makes the key process-wide. A per-run key keeps export tied to the hosted runs.
- **An OTLP bridge to OpenAI.** OpenAI's dashboard doesn't take OTLP, and the Agents SDK already produces the right trace shape.
- **Tracing local runs too.** The owner chose hosted only. Local content never leaves the PC through tracing (ADR-0002, ADR-0004).

## Verification

Test-first:
- `tests/runtime/hosted.test.ts`:
  - accepted and rejected `OPENAI_TRACES` values;
  - it throws without hosted replies and with a non-OpenAI base URL;
  - a valid config carries `openaiTraces: true`.
- `tests/runtime/openai-traces.test.ts`, against a local fixture model server with a capturing trace processor:
  - no Agents SDK trace for a local run, or for a hosted run without `openaiTraces`;
  - one `Oracle teller reply` trace for a traced hosted run, with the hosted key as its `tracingApiKey` and the OTel trace ID in its metadata;
  - a local run after a traced run still creates no trace;
  - generation input and output appear in the trace's spans only with `TRACE_CONTENT=1`.

Then a live check: a hosted reply appears in the OpenAI Traces dashboard, and the owner grades a few there.

## ADR alignment

- ADR-0022 (new): implemented as written. It's opt-in, covers hosted OpenAI replies only, uses a per-run key, follows `TRACE_CONTENT` for content, and adds no Evals code.
- ADR-0004: its OpenAI tracing and evals clauses are superseded for hosted replies by ADR-0022. OpenTelemetry, Langfuse and LangSmith are unchanged. Local runs still never go to OpenAI tracing.
- ADR-0002, ADR-0010: nothing new leaves the PC by default. With the switch on, only data OpenAI already received as the hosted provider is traced there.
- ADR-0014: hosted replies, no fallback and memory consent are unchanged. The key still never appears in responses, logs or traces.
- ADR-0003: uses the Agents SDK's own tracing.
- ADR-0021: guardrail calls are not traced to OpenAI.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0010, ADR-0014, ADR-0021
