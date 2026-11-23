## MODIFIED Requirements

### Requirement: Source-linked memory lifecycle

Each saved memory SHALL link to its source conversation when it is created. Conversation transcripts and memories SHALL remain distinct records. Deleting a single conversation SHALL delete memories linked to that conversation. Clearing all chat history SHALL instead keep every memory and remove its source link.

#### Scenario: Source conversation deletion
- **WHEN** one conversation with source-linked memories is deleted
- **THEN** its transcript and those memories are deleted
- **AND** memories from other conversations remain

#### Scenario: Clearing all chats keeps memories
- **WHEN** the user clears all chat history
- **THEN** all memories remain, with no source conversation
