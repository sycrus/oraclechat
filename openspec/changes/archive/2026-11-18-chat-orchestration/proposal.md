# Build persistent chat and teller orchestration

Add durable local conversations, two tarot teller profiles, relevance-based group replies, streaming responses, and the desktop-first chat flow.

## Why

The local runtime foundation is in place, but users cannot yet start or persist chats. The agreed first release includes Mira and Sage, 1:1 and group chats, one local relevance-ranking call, ordered responses, and cross-teller awareness.

## Scope

- Persist conversations and attributed messages in local PostgreSQL.
- Add Mira and Sage as the two tarot tellers.
- Route 1:1 messages directly; in groups always select the highest-ranked teller and include the second only above the configured threshold.
- Stream teller text in relevance order; pass prior group responses to later tellers.
- Build the desktop-first conversation sidebar and chat pane.

## Non-goals

- Tarot draws and reading components, consent-based memory, web search, additional tellers, and OpenAI-hosted inference.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0007
