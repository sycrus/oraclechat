## ADDED Requirements

### Requirement: Packaged MVP teller definitions
The backend production build SHALL include the YAML definitions for Mira and Sage at the path used by the runtime teller registry.

#### Scenario: Compiled service loads the MVP roster
- **WHEN** the compiled backend starts with its distribution assets
- **THEN** the registry contains Mira and Sage
- **AND** a conversation can be created for either teller
