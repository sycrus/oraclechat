# Spec Delta

## MODIFIED Requirements

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
