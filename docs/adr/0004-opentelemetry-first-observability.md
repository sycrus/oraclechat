# ADR-0004: OpenTelemetry-first observability

**Status:** Accepted
**Date:** 2026-11-17
**Supersedes:** None

## Context

Oracle needs traces across model calls, teller routing, retrieval, memory, and the web/API services. Local-first inference also means prompts and personal context should not be exported to a hosted tracing service by default. The project does not want to adopt the OpenAI Evals product.

## Decision

Use OpenTelemetry spans and trace context as the provider-neutral observability foundation. Use Langfuse and/or LangSmith as optional destinations where relevant. Do not export local-first run content to OpenAI tracing by default. Do not use OpenAI Evals or Agent Builder Evals.

## Consequences

- Instrumentation remains usable across local and hosted model providers.
- Exporters are optional and configured separately from model selection.
- Trace content is subject to privacy controls; default traces should avoid collecting full prompts or personal memory unless explicitly configured.
- Prompt and behavior quality checks use ordinary automated tests and trace review, not the OpenAI Evals product.

## Validation

Tests or a manual trace review verify end-to-end trace context across agent and tool spans. Local mode does not export prompt or response content to OpenAI tracing. CI and local checks confirm no OpenAI Evals dependency or configuration is introduced.
