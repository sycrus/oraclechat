## Context

- `agent/runtime.ts`: `runLocalAgent` and `streamLocalAgent` open an `oracle.agent.run` span, mark it as a generation (`markGeneration`) and record token usage (`recordUsage`). No content is recorded, and the Agents SDK's own tracing is disabled with `traceIncludeSensitiveData: false`.
- `observability/otel.ts`: `initTelemetry` starts the SDK and logs the active destinations. Every span goes to every configured destination (Langfuse, LangSmith, or the console).
- `tests/runtime/tracing.test.ts` asserts that span attributes contain no instructions, input or output.

## Decision

- **Switch.** `traceContentEnabled(env = process.env)` in `observability/otel.ts` returns true only for `TRACE_CONTENT` of `1` or `true` (case-insensitive, trimmed). It is read when a span is recorded, so tests can set it per case.
- **Recording.** In `runtime.ts`, when the switch is on, the model-call span gets `langfuse.observation.input` = JSON `[{ role: "system", content: instructions }, { role: "user", content: input }]` and, once the run completes, `langfuse.observation.output` = the returned text (the JSON string for structured output). A failed run records only the input.
- **Startup.** `initTelemetry` logs `[otel] TRACE_CONTENT is on: prompts and replies are recorded in model-call spans` when the switch is on.
- **Docs.** `.env.example` gains a commented `TRACE_CONTENT=`. `docs/operations.md` explains what is recorded and that LangSmith receives it too when configured.

Rejected:
- **Langfuse-only capture.** It needs a span processor that strips attributes per destination. That is more code than a single-user debugging switch needs; the docs say to leave `LANGSMITH_API_KEY` empty to keep content local.
- **The OpenTelemetry `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` name.** It belongs to instrumentation libraries this app does not use; a short app-level name is clearer in `.env`.

## Verification

Test-first, in `tests/runtime/tracing.test.ts`:
- Off by default: the existing "no content" test keeps passing with `TRACE_CONTENT` unset, and with `TRACE_CONTENT=0`.
- On: `runLocalAgent` and `streamLocalAgent` spans carry the instructions and input in `langfuse.observation.input` and the reply in `langfuse.observation.output`.
- `traceContentEnabled` accepts `1`, `true`, ` TRUE `, and rejects unset, empty, `0` and `yes`.

Then a live check: with `TRACE_CONTENT=1`, a chat turn shows its prompt and reply in local Langfuse.

## ADR alignment

- ADR-0004: "default traces should avoid collecting full prompts or personal memory unless explicitly configured". Content stays off by default; `TRACE_CONTENT` is the explicit configuration.
- ADR-0002 and ADR-0010: nothing new leaves the PC by default. With the switch on, content goes only to destinations the owner has configured.
- ADR-0009 and ADR-0014: memory recall and hosted consent are unchanged. Recalled memories inside the instructions are recorded only when the owner turns the switch on, which the docs state.
- ADR-0001: the change is specified in OpenSpec before implementation.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0004, ADR-0009, ADR-0010, ADR-0014
