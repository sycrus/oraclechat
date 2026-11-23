## MODIFIED Requirements

### Requirement: Local relevance ranking

For a two-teller message, orchestration SHALL make one local-model call and receive one validated score per eligible teller. Each score SHALL be in the range 0 to 1 and include matched activation-profile categories. Inputs include teller topics, emotional tones, situations, and the current message. Saved user context MAY be included only when memory consent is active. Scores SHALL determine participation, not teller prose.

The application SHALL parse the first complete JSON score array from the local-model response. If a score omits its teller ID, orchestration SHALL associate it with the teller at the same position in the supplied roster. If matched categories are omitted, they SHALL default to an empty list. Explicit IDs SHALL match eligible tellers exactly and SHALL NOT be duplicated. Invalid scores, malformed arrays, or an incomplete score list SHALL be rejected.

#### Scenario: Rank output with omitted metadata is normalized by roster order
- **WHEN** the local model returns one score per teller but omits teller IDs or matched categories
- **THEN** omitted IDs are associated by supplied roster order
- **AND** omitted matched categories become an empty list

#### Scenario: Rank output includes surrounding explanation
- **WHEN** the local model adds text around its JSON score array
- **THEN** the first complete array is parsed and validated

#### Scenario: Invalid rank output is rejected
- **WHEN** the ranker returns an invalid score, unknown explicit ID, duplicate ID, malformed array, or incomplete score list
- **THEN** the ranking result is rejected
- **AND** no invalid participation decision is made
