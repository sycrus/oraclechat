## ADDED Requirements

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
