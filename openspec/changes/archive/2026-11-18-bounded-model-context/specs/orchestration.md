## MODIFIED Requirements

### Requirement: Response ordering

In a two-teller conversation both tellers SHALL respond to every user message. Relevance scores SHALL determine response order only: the higher-scored teller SHALL respond first. If scores tie, the teller who spoke least recently SHALL go first. If ranking fails (local model error or invalid output), the turn SHALL continue with both tellers in least-recently-spoken order. Responses SHALL stream in that order.

#### Scenario: Both tellers respond regardless of score
- **WHEN** scores are 0.82 and 0.10
- **THEN** both tellers respond, the 0.82 teller first

#### Scenario: Tie uses least-recently-spoken
- **WHEN** both tellers have equal scores
- **THEN** the teller with the earlier last response goes first

#### Scenario: Ranking failure does not fail the turn
- **WHEN** the ranker returns invalid or incomplete output
- **THEN** both tellers still respond, the least recently spoken first

## ADDED Requirements

### Requirement: Category normalisation

Matched categories that are not `topics`, `emotionalTones` or `situations` SHALL be dropped from a score rather than invalidating the ranking.

#### Scenario: Profile values echoed as categories
- **WHEN** the ranker returns `matchedCategories: ["emotions", "situations"]`
- **THEN** the score is accepted with `matchedCategories: ["situations"]`
