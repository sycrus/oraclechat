# ADR-0002: Local-first model execution

**Status:** Accepted
**Date:** 2026-11-17
**Supersedes:** None

## Context

Oracle should support development and ordinary operation without requiring a paid hosted-model API key. Users may share personal context under explicit memory consent, and cloud model calls should remain an intentional option.

## Decision

Use a local model endpoint as the default inference provider. Keep model access behind a provider boundary so an OpenAI API provider can be enabled later for selected tasks. Paid OpenAI models and hosted tools are future optional integrations; they are not required for the baseline path. The initial local integration candidate is Ollama with an OpenAI-compatible endpoint; the production inference host remains undecided.

Local and hosted calls may expose different API features. Keep retrieval and application tools behind app-owned interfaces rather than assuming a local endpoint supports OpenAI Responses-only tools.

## Consequences

- Baseline development does not require an OpenAI API key.
- Tool routing must work with the features supported by the selected local model and endpoint.
- Enabling a hosted provider must be explicit and must follow Oracle's consent and data-handling rules.
- Production hosting, model selection, and hardware sizing for local inference need a separate deployment decision.

## Validation

The local profile starts and handles supported model tasks without an OpenAI key. Tests verify provider selection and that the local profile does not call a hosted model or hosted tool. If a cloud provider is enabled, tests verify the route is explicit and uses only the intended context.
