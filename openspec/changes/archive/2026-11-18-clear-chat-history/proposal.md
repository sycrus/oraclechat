## Intent

Let the user clear all chat history in one step while keeping their saved memories.

## Why now

Conversations can only be deleted one at a time. The owner wants a clean slate, but has just confirmed that memory works and wants to keep those memories.

## What changes

- A **Clear chat history** control in the sidebar, behind a confirmation, deletes every conversation and its messages.
- Saved memories are **kept**: before the bulk delete, each memory's source-conversation link is cleared, so it survives. Deleting a single conversation still deletes the memories learned in it.
- `DELETE /api/conversations` performs the bulk clear. Memories may now have no source conversation (`sourceConversationId: null`).

## Non-goals

- Changing single-conversation deletion.
- Clearing memories (Memory & privacy already handles that, including revoke-and-delete-all).

ADRs reviewed: ADR-0001, ADR-0007, ADR-0009
