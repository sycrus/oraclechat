## ADDED Requirements

### Requirement: Controlled model thinking

Structured local-model tasks (relevance ranking and memory extraction) SHALL run with model thinking disabled. Teller replies SHALL run with thinking disabled unless `TELLER_THINKING=true`. Disabling thinking SHALL be requested through the local OpenAI-compatible endpoint (`reasoning_effort: "none"`) without calling any hosted provider.

#### Scenario: Ranker runs without thinking
- **WHEN** a group message is ranked
- **THEN** the local model request carries `reasoning_effort: "none"`

#### Scenario: Teller thinking is configurable
- **WHEN** `TELLER_THINKING` is unset
- **THEN** teller requests carry `reasoning_effort: "none"`
- **AND** when it is `true`, teller requests use the model's default thinking
