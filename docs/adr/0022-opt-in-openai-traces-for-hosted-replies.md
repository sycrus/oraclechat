# ADR-0022: Opt-in OpenAI traces for hosted teller replies

**Status:** Accepted
**Date:** 2026-11-26
**Supersedes:** In ADR-0004, "Do not export local-first run content to OpenAI tracing by default" and "Do not use OpenAI Evals or Agent Builder Evals", for hosted teller replies only. ADR-0004's OpenTelemetry, Langfuse and LangSmith rules carry over unchanged.

## Context

ADR-0004 keeps OpenAI tracing off and rules out OpenAI's evaluation products, so local run content never reaches OpenAI by accident. ADR-0014 then added hosted teller replies. When the hosted provider is OpenAI, every hosted reply's instructions, context and text already go to OpenAI as the model request. The owner wants to see those replies in the OpenAI Traces dashboard and grade some of them there, next to the Langfuse traces. OpenAI's dashboard takes Agents SDK traces, not the OTLP spans Langfuse receives, so this needs the Agents SDK's own trace export. Oracle turns that export off today.

## Decision

- **Opt-in.** Setting `OPENAI_TRACES=1` (or `true`) turns it on. Unset or any other value keeps Agents SDK tracing off, as before.
- **Hosted OpenAI replies only.** It requires hosted replies (ADR-0014) with `HOSTED_BASE_URL` on `api.openai.com`. Without that, startup fails and names the problem, so traces never go to a party that isn't already the model provider. Routing, memory extraction, embeddings, guardrail checks and every local model call are never exported to OpenAI.
- **Key.** Traces are exported with `HOSTED_API_KEY`, set per run (`RunConfig.tracing.apiKey`), never as a process-wide key. The key never appears in a trace.
- **Content follows `TRACE_CONTENT`.** OpenAI traces include the prompt and reply only when `TRACE_CONTENT` is on (`traceIncludeSensitiveData`). Otherwise they carry the span structure, model and timing.
- **Linkable.** Each OpenAI trace is named `Oracle teller reply` and carries the teller name and the OpenTelemetry trace ID as metadata, so it can be matched to its Langfuse trace.
- **Grading in the dashboard is allowed** for these traces, as manual review by the owner. Oracle's code adds no OpenAI Evals API calls, dependency or configuration. Automated quality checks stay in ordinary tests and the local model-comparison eval.
- **OpenTelemetry stays the source of truth.** Langfuse and LangSmith export are unchanged and independent of this switch.

## Consequences

- With the switch on, OpenAI keeps the traces under the OpenAI project's own retention. The data is what OpenAI already received as the hosted provider, but it's now stored for viewing. Turning the switch off stops new traces and doesn't delete old ones.
- Organizations under Zero Data Retention can't use OpenAI tracing, so the switch does nothing useful there.
- A second exporter (the Agents SDK's batch processor) runs in the backend while the switch is on. It's flushed on shutdown.
- Hosted providers other than OpenAI get no trace export. Using one with the switch on is a configuration error.

## Validation

Tests verify that:

- with `OPENAI_TRACES` unset or invalid, no run creates an Agents SDK trace, hosted or local;
- with it on, a hosted reply creates one trace named `Oracle teller reply`, exported with the hosted key and carrying the OpenTelemetry trace ID, while a local run in the same process creates none;
- trace content is included only when `TRACE_CONTENT` is also on;
- startup fails when the switch is on without hosted replies, or with a non-OpenAI `HOSTED_BASE_URL`;
- no OpenAI Evals dependency is added.

A live check confirms that a hosted reply appears in the OpenAI Traces dashboard and that a local routing call does not.
