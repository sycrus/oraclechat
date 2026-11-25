## Purpose

Defines consent-controlled, local user memory for Oracle's single-user MVP. Conversation transcripts and extracted memories are separate records. Memory is off until the user explicitly opts in.

---

### Requirement: Explicit consent gates memory access

The application SHALL read or write personalization memories only while the local user has an active consent record. A new installation SHALL default to no consent. The user SHALL be able to revoke consent at any time; revocation SHALL stop future memory reads and writes and delete every saved memory.

#### Scenario: No memory access before opt-in

- GIVEN no active memory consent exists
- WHEN a user sends a message
- THEN the ranker and tellers receive no saved memories
- AND no memory extraction or write occurs
- AND the user can see that memory is off

#### Scenario: Opt in and recall

- GIVEN the user explicitly opts in
- AND an extracted memory is linked to an earlier conversation
- WHEN a later message is ranked or answered
- THEN the memory may be supplied as context to local models
- AND no transcript text is stored as a memory without extraction

#### Scenario: Revocation clears saved memories

- GIVEN the user has opted in and memories exist
- WHEN the user revokes consent
- THEN all saved memories are deleted
- AND subsequent ranker and teller requests receive no saved memory context

### Requirement: User memory controls

With active consent, the user SHALL be able to view, edit, and delete each saved memory. Revoked or absent consent SHALL return no memories through the user-facing memory API.

#### Scenario: Edit or delete a saved memory

- GIVEN active consent and a saved memory
- WHEN the user edits or deletes it
- THEN the stored value is updated or removed
- AND the updated collection is returned by the memory view

### Requirement: Source-linked memory lifecycle

Each saved memory SHALL link to its source conversation when it is created. Conversation transcripts and memories SHALL remain distinct records. Deleting a single conversation SHALL delete memories linked to that conversation. Clearing all chat history SHALL instead keep every memory and remove its source link.

#### Scenario: Source conversation deletion
- **WHEN** one conversation with source-linked memories is deleted
- **THEN** its transcript and those memories are deleted
- **AND** memories from other conversations remain

#### Scenario: Clearing all chats keeps memories
- **WHEN** the user clears all chat history
- **THEN** all memories remain, with no source conversation

### Requirement: Relevant fact extraction

When consent is active, the application MAY use the configured local model to maintain durable, high-signal facts that the user explicitly stated. Extraction SHALL receive the existing memories and only the user's three most recent messages in the conversation, never teller replies, and SHALL return `add` or `update` operations, so a fact that replaces an older one updates it instead of duplicating it. Each fact SHALL be labelled `core` or `detail` and tagged with lower-cased entities. A fact about the user's own interaction with a teller present in the conversation SHALL be tagged with that teller's ID. Extraction SHALL exclude teller statements, interpretations, questions and conversational filler, and SHALL NOT delete memories. Extraction failures SHALL NOT interrupt chat. No hosted model is called in local mode.

#### Scenario: Extract explicit user facts
- **WHEN** a consented conversation turn completes in which the user states durable personal details
- **THEN** the local extractor may save concise facts linked to that conversation
- **AND** duplicate facts are not saved again

#### Scenario: A new fact replaces an old one
- **WHEN** a memory says "Lives in Tokyo" and the user says they have moved to Osaka
- **THEN** that memory is updated to the new fact rather than a second memory being added

#### Scenario: Interaction with a teller is tagged
- **WHEN** the user tells Mira they will try the step she suggested
- **THEN** the saved fact carries the entity `mira-the-mystic`

#### Scenario: Extraction sees only recent user messages
- **GIVEN** the user has sent four messages in a conversation
- **WHEN** extraction runs after the turn
- **THEN** the extractor receives only the last three user messages and no teller replies
- **AND** a fact stated only in the first message is not extracted on this turn

#### Scenario: Extraction fails
- **WHEN** the local extractor is unavailable or returns invalid operations
- **THEN** the conversation response remains available
- **AND** no invalid memory is saved or changed

### Requirement: Relevance-filtered recall

With consent active, the memories supplied to each teller SHALL be selected per message rather than sending all memories. The selection SHALL be: all `core` memories (at most 3); memories whose entity is named in the user's message or equals the responding teller's ID; and up to 3 memories whose local embedding similarity to the message meets the similarity floor and stands clearly above the average similarity across all memories. The selection SHALL be de-duplicated and capped at 8. If embeddings are unavailable, recall SHALL still return core and entity matches. Embeddings SHALL be produced only by the configured local Ollama model and SHALL be deleted with their memory.

#### Scenario: The router receives no memories
- **WHEN** memory consent is on and memories are saved
- **THEN** recall runs for each replying teller only, and the routing call receives no memories (see the orchestration spec, ADR-0012)

#### Scenario: Teller recalls its own history
- **WHEN** a memory is tagged `mira-the-mystic` and both tellers reply to an unrelated message
- **THEN** Mira's context includes that memory
- **AND** Sage's context does not, unless it is otherwise relevant

#### Scenario: A named person pulls their memories
- **WHEN** the user mentions "Ana" and memories are tagged `ana`
- **THEN** those memories are included even if they are not semantically similar to the message

#### Scenario: Recall is bounded
- **WHEN** more than 8 memories qualify
- **THEN** at most 8 are supplied, in the order core, entity matches, then by similarity

#### Scenario: Embedder unavailable
- **WHEN** the local embedding model cannot be reached
- **THEN** memories are still saved, and recall returns core and entity matches

### Requirement: Pinning core memories

With consent active, the user SHALL be able to pin a memory as `core` or unpin it to `detail`, and SHALL see each memory's entity tags. Editing a memory's content SHALL refresh its embedding.

#### Scenario: Pin a memory
- **WHEN** the user pins a memory
- **THEN** it is stored as `core` and included in every recall

### Requirement: Separate consent for sharing memories with a hosted model

Saved memories SHALL reach a hosted teller reply only when memory consent is on and the user has also turned on *Share saved details with the hosted model*. That setting SHALL default to off, SHALL be changeable only while hosted replies are configured and memory consent is on, and SHALL be cleared whenever memory consent is revoked. Local replies SHALL be unaffected by it.

#### Scenario: Hosted reply without the second opt-in
- **WHEN** memory consent is on, hosted replies are configured, and hosted sharing is off
- **THEN** hosted teller replies receive no saved memories

#### Scenario: Hosted reply with both opt-ins
- **WHEN** memory consent and hosted sharing are both on
- **THEN** hosted teller replies receive the same recalled memories a local reply would

#### Scenario: Sharing needs memory and a hosted provider
- **WHEN** the user tries to turn on hosted sharing while memory is off or no hosted provider is configured
- **THEN** the request is rejected and the setting stays off

#### Scenario: Revoking memory clears hosted sharing
- **WHEN** the user revokes memory consent
- **THEN** hosted sharing is turned off as well
