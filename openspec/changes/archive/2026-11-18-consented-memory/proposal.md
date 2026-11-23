# Add consent-based local memory

Implement explicitly opt-in local memory with source-linked extraction, context recall, user controls, and complete cleanup on revocation or source conversation deletion.

## Why

The approved MVP requires chat personalization while keeping transcripts and extracted facts separate and ensuring no memory is read or written without consent.

## Scope

- Default to memory off; provide explicit opt-in, view, edit, delete, and revoke controls.
- Use only local inference to extract explicit durable facts after chat turns.
- Link saved memories to their source conversation and pass them to ranker/tellers only after consent.
- Delete saved memories on revocation and cascade source-linked cleanup when a conversation is deleted.

## Non-goals

- Multi-user identity, cloud memory, external vector stores, or memory without consent.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007
