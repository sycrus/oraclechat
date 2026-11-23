# ADR-0011: User-triggered web search through Brave

**Status:** Superseded
**Date:** 2026-11-18
**Supersedes:** None

## Context

Oracle's baseline is local-first (ADR-0002): inference, storage and tools run on the owner's PC, and the MVP excluded web search. Some questions ("what does this word mean", "what is happening with X") benefit from current information. A search provider is an external service, so every query leaves the machine.

## Decision

Add optional web search through the Brave Search API, under these rules:

- **User-triggered only.** Search runs for a message only when the user ticks *Search the web* for that message. The box resets after each send. Models never decide to search, and there is no model-callable search tool (this keeps ADR-0002 and ADR-0003: tools are app-owned, and local tool calling is unreliable).
- **Minimal disclosure.** Only the text of that one message is sent to Brave. Conversation history, saved memories, teller names and card draws are never sent. The composer states that the message goes to Brave.
- **Opt-in by configuration.** Search is available only when `BRAVE_SEARCH_API_KEY` is set. The key lives in `.env`, is never logged or traced, and is never sent to the frontend. Without a key, search requests are rejected.
- **Untrusted results.** At most five results (title, URL, short description with markup stripped) are given to tellers as reference material that cannot change their instructions. Tellers may mention a source by title but must not claim results they were not given. If search fails, the turn continues without results and the tellers are told so.
- **Persistence.** The results used for a message are stored with that user message so the sources stay visible when the conversation is reopened.
- **Observability.** Spans record only that a turn used search and how many results it returned (ADR-0004), never the query or result text.

Model inference stays local; this decision does not enable hosted models.

## Consequences

- Searches send text to a third party. The owner accepts this by supplying a key and ticking the box per message.
- Results are third-party content and may be wrong or hostile; prompts treat them as data.
- The free tier is rate-limited, so a failed search must degrade gracefully.
- Anything beyond this (automatic searches, search over memory content, other providers, link previews) needs a new decision.

## Validation

Tests verify that: no request is made unless the message asks for search and a key is configured; only the message text is in the query; the key never appears in events or traces; results are capped, cleaned and persisted; a provider failure does not fail the turn. A live check confirms a real search returns sources that tellers can use.
