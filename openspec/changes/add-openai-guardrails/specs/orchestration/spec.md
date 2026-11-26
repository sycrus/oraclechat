# Spec Delta

## MODIFIED Requirements

### Requirement: Response ordering

In a two-teller conversation both tellers SHALL respond to every user message, except in a care turn (see the `guardrails` capability), where only the least recently spoken teller SHALL respond and routing SHALL be skipped. Relevance scores SHALL determine response order only: the higher-scored teller SHALL respond first. If scores tie, the teller who spoke least recently SHALL go first. If routing fails (local model error or invalid output), the turn SHALL continue with both tellers in least-recently-spoken order, with no reading and no lookup. Responses SHALL stream in that order.

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

#### Scenario: Care turn has one responder
- **GIVEN** a two-teller conversation in guarded mode
- **WHEN** the user's message starts a care turn
- **THEN** the router is not called
- **AND** only the least recently spoken teller responds

## REMOVED Requirements

### Deferred requirement: Response guardrail evaluation

Replaced by the `guardrails` capability.
