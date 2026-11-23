## MODIFIED Requirements

### Requirement: Local relevance ranking

Every turn, in one-to-one and group chats, orchestration SHALL make one local-model routing call and receive one validated route per teller in the conversation. Each route SHALL include a score from 0 to 1 with matched activation-profile categories, and a reading request (`named`, `unnamed` or `none`). For a tarot teller it MAY include a spread, and it MAY include a search query of at most 200 characters. Inputs are each teller's name, discipline and activation profile, the previous turn's teller replies, and the current message. Saved memories SHALL NOT be included. Scores SHALL determine response order, not teller prose.

#### Scenario: Relevant tellers are ranked from the message

- GIVEN a group with Mira and Sage
- WHEN the user asks about a difficult work situation
- THEN one local routing call evaluates both activation profiles
- AND it returns a bounded score for each teller
- AND the most relevant teller responds first

#### Scenario: One-to-one turns are routed
- **WHEN** the user writes to Mira in a one-to-one chat
- **THEN** one routing call returns Mira's route, including any reading request and query

#### Scenario: Memories never reach the router
- **WHEN** the user has opted in to memory and has saved memories
- **THEN** no saved memory is included in the routing input

#### Scenario: Invalid rank output is rejected

- GIVEN the router returns an out-of-range score, an unknown teller, or an incomplete list
- WHEN output validation runs
- THEN the routing result is rejected
- AND no invalid ordering, reading or lookup decision is made

#### Scenario: Rank output with omitted metadata is normalized by roster order
- GIVEN the local model returns one valid score per teller but omits teller IDs, matched categories, reading, spread or query
- WHEN the application validates the JSON array
- THEN omitted teller IDs are associated by the supplied roster order
- AND omitted matched categories are treated as an empty list, an omitted or invalid reading as `none`, and an omitted query as no lookup
- AND an invalid score, unknown explicit teller ID, duplicate ID, or incomplete list is rejected

#### Scenario: Spread and query are normalized
- **WHEN** the router returns a spread for an I Ching teller, no spread for a tarot reading, or an over-long or blank query
- **THEN** the I Ching spread is dropped, the tarot reading uses `three-card`, the query is capped at 200 characters, and a blank query means no lookup

#### Scenario: Rank output includes surrounding explanation
- GIVEN the local model includes text before or after its JSON array
- WHEN the application validates the routing
- THEN it parses the first complete JSON array and validates its entries

### Requirement: Response ordering

In a two-teller conversation both tellers SHALL respond to every user message. Relevance scores SHALL determine response order only: the higher-scored teller SHALL respond first. If scores tie, the teller who spoke least recently SHALL go first. If routing fails (local model error or invalid output), the turn SHALL continue with both tellers in least-recently-spoken order, with no reading and no lookup. Responses SHALL stream in that order.

#### Scenario: Both tellers respond regardless of score
- **WHEN** scores are 0.82 and 0.10
- **THEN** both tellers respond, the 0.82 teller first

#### Scenario: Tie uses least-recently-spoken
- **WHEN** both tellers have equal scores
- **THEN** the teller with the earlier last response goes first

#### Scenario: Ranking failure does not fail the turn
- **WHEN** the router returns invalid or incomplete output
- **THEN** both tellers still respond, the least recently spoken first
- **AND** no reading or lookup happens that turn

### Requirement: Privacy-filtered orchestration traces

OpenTelemetry SHALL record relevance scores, matched categories, each teller's reading request, spread and whether it has a query, and the ordered responder teller IDs. The routing span `oracle.orchestration.route` SHALL enclose the router's model call. Traces SHALL NOT include raw message text, prompts, model output, search queries, or personal memory content by default.

#### Scenario: Ranking is observable without message content
- **WHEN** a turn is routed and responders are ordered
- **THEN** scores, categories, reading requests, spreads, lookup flags and ordered teller IDs are available
- **AND** message text, queries and memory text are absent

#### Scenario: Router model call nests under the routing span
- **WHEN** a turn is routed
- **THEN** the router's model-call span is a child of `oracle.orchestration.route`
