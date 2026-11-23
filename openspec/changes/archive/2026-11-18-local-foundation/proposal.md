# Establish the local runtime foundation

Make Oracle runnable locally with a health endpoint, an Agents SDK call through Ollama, and privacy-filtered OpenTelemetry traces.

## Why

The agreed MVP is local-first and targets the user's Windows 11/RTX 5080 machine. The active code has teller schemas but no running Oracle agent service or model integration. This change provides the runtime foundation for chat and tarot milestones.

## Scope

- Add the Express agent service and health endpoint.
- Use the Agents SDK with an Ollama-compatible Chat Completions endpoint by default; do not require or silently use a paid API key.
- Add a local model smoke command and provider-neutral OTel instrumentation.
- Disable the Agents SDK's OpenAI trace exporter by default; optional Langfuse uses the existing OTel path.

## Non-goals

- Chat, teller ranking, tarot draw, Postgres persistence, and memory behavior (later milestones).
- Install or change global Windows software as part of the application code change.
- OpenAI-hosted model implementation or activation in the MVP.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007
