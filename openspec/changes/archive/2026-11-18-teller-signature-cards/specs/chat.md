## ADDED Requirements

### Requirement: Signature card in the reply

`message_start` SHALL include the teller's signature card, and the reply SHALL display it labeled by position (Action card, Shadow card) above the reply text, before streaming text arrives.

#### Scenario: Card appears when the teller starts
- **WHEN** a `message_start` event arrives for Sage
- **THEN** Sage's shadow card is shown at the top of Sage's reply

### Requirement: Failed turns report their reason

When a turn fails after streaming has started, the stream SHALL end with an `error` event whose `error` field carries the failure reason, and the UI SHALL show that reason.

#### Scenario: Ranker failure is reported
- **WHEN** the ranker selects no teller for a group turn
- **THEN** the stream ends with `{"type":"error","error":"Ranker did not select a conversation teller"}`
