## Intent

Let the owner see hosted teller replies in the OpenAI Traces dashboard, next to Langfuse, and grade a few there, by turning it on in `.env`.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0010, ADR-0014, ADR-0021

## Why

Hosted replies through OpenAI now work (ADR-0014). The owner wants to use OpenAI's own trace view and grading on those replies, which needs Agents SDK traces, not the OTLP spans Langfuse gets. Oracle disables Agents SDK tracing everywhere, and ADR-0004 rules out OpenAI tracing and evals. This change adds ADR-0022 to supersede those two clauses for hosted replies only.

## What changes

- **Configuration.** `OPENAI_TRACES=1` (or `true`) turns OpenAI trace export on. It requires hosted replies on `api.openai.com`; otherwise startup fails and says why.
- **Scope.** Only hosted teller replies are traced to OpenAI, one trace per reply named `Oracle teller reply`, exported with `HOSTED_API_KEY`. Local runs (routing, memory, local replies) and guardrail checks are never exported.
- **Content.** The OpenAI trace includes prompt and reply only when `TRACE_CONTENT` is also on.
- **Linking.** Each trace carries the teller name and the OpenTelemetry trace ID as metadata.
- **Shutdown.** Pending Agents SDK traces are flushed when the backend stops.
- **Docs.** `.env.example`, `docs/operations.md` and ADR-0022.

## Non-goals

- Tracing local runs or other hosted providers to OpenAI.
- Using the OpenAI Evals API or any eval configuration in code.
- Changing Langfuse or LangSmith export.
