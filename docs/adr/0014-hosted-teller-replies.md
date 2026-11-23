# ADR-0014: Optional hosted teller replies through an OpenAI-compatible API

**Status:** Accepted
**Date:** 2026-11-19
**Supersedes:** None (takes up the hosted-provider option ADR-0002 left open; ADR-0010 still governs the local profile)

## Context

ADR-0002 makes local inference the default and allows a hosted provider only as an explicit option that follows Oracle's consent and data-handling rules. The local `qwen3.5:9b` model handles routing and memory well, but teller replies are where a stronger model helps most. The owner wants a hosted option that stays off unless configured, never acts as a silent fallback, and never sends saved memories without a separate opt-in.

## Decision

- **Any OpenAI-compatible API.** A hosted provider is configured with `HOSTED_BASE_URL`, `HOSTED_API_KEY` and `HOSTED_MODEL` in `.env`. It works with OpenAI, OpenRouter, Anthropic's OpenAI-compatible endpoint and similar services, through the same Agents SDK runtime used for Ollama.
- **Off by default, all or nothing.** With none of the three set, Oracle is fully local. If only some are set, the backend refuses to start and names the missing ones.
- **Teller replies only.** When configured, every teller reply streams from the hosted model. Routing, memory extraction and embeddings stay local. No other call goes to the hosted provider.
- **No fallback, either way.** A failed hosted reply ends the turn with an error. It never retries on the local model, and a failed local call never goes hosted.
- **What hosted replies receive:** the teller's instructions and the turn context the local model would get (bounded history, readings, link text, the teller's own search results). Reasoning settings are left to the provider.
- **Memories need a second opt-in.** Saved memories go to hosted replies only when memory consent is on and the user also turns on *Share saved details with the hosted model*. That setting is off by default, can be changed only while hosted replies are configured and memory is on, and is cleared whenever memory consent is revoked.
- **Visible.** The UI shows when replies come from a hosted model, and the memory panel shows the hosted-sharing setting.
- **Secrets and traces.** The API key stays in `.env` and never appears in responses, logs or traces. Spans record that a reply was hosted and which model it used (ADR-0004), never the key or content.

## Consequences

- With the provider configured, every teller reply's conversation context leaves the PC. The owner accepts that by setting the variables; removing them returns Oracle to fully local.
- Hosted tellers know less about the user unless the second opt-in is on.
- Costs and rate limits now apply to teller replies, and a provider outage stops replies until it recovers or the variables are removed.
- Hosted replies can't use the local thinking switch (`TELLER_THINKING`), because providers handle reasoning differently.

## Validation

Tests verify that:

- with no hosted variables, teller replies use the local endpoint; partial configuration fails startup;
- with them, teller replies go to the hosted endpoint with the key, and routing and memory extraction still go to the local endpoint;
- a hosted failure produces an error event and no local retry;
- memories reach a hosted reply only with both consents; hosted sharing can't be turned on without memory consent or a hosted provider, and revoking memory consent clears it;
- the key never appears in API responses or spans.

A live check confirms one hosted reply streams in the UI with the hosted label shown.
