## Context

`user_memories.source_conversation_id` is `NOT NULL REFERENCES conversations(id) ON DELETE CASCADE`, so deleting a conversation deletes its memories. Conversations are deleted one by one through `DELETE /api/conversations/:id`.

## Decision

- **Schema.** Make `source_conversation_id` nullable (`ALTER COLUMN … DROP NOT NULL`), keeping the cascade. `UserMemory.sourceConversationId` becomes `string | null`.
- **Memory.** `MemoryStore.detachAllSources()` sets `source_conversation_id = NULL` for the local user. `MemoryService.keepAfterChatClear()` calls it. It needs no consent check: it only removes a link, and does nothing when no memories exist.
- **Chat.**
  - `ChatStore.deleteAllConversations()` deletes every conversation; messages and teller links cascade.
  - `ChatService.clearConversations()` detaches memory sources first, then deletes all conversations.
  - `DELETE /api/conversations` returns 204, and the frontend proxy route forwards `DELETE`.
- **UI.** The sidebar's **Clear chat history** button is shown only when conversations exist. A `window.confirm` asks: "Delete all conversations? Your saved memories are kept." On success, the list and active chat are cleared.

Rejected:
- Removing the cascade globally. Single-chat deletion should still remove its memories, as the memory spec requires.

## Verification

Test-first:
- Store: `deleteAllConversations` removes every conversation and message.
- Service: `clearConversations` keeps memories, now with a null source; a single-conversation delete still removes its memories.
- API: `DELETE /api/conversations` returns 204 and the list is empty afterwards.
- UI: a pure helper `confirmClearMessage` returns the confirmation text.

## ADR alignment

- ADR-0009: memories remain consent-gated and user-owned; revoking consent still deletes all of them.
- ADR-0001 and ADR-0007: single-user local data; nothing leaves the machine.

ADRs reviewed: ADR-0001, ADR-0007, ADR-0009
