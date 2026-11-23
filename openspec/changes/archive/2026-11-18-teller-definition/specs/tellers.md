## Purpose

Delta spec for the teller-definition change. Adds requirements for the teller schema and registry service.

---

### ADDED Requirement: Teller definition schema

The system SHALL define a Zod-validated TypeScript type for teller definitions with the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string (kebab-case) | yes | Unique identifier, e.g. "mira-the-mystic" |
| `displayName` | string | yes | Display name, e.g. "Mira" |
| `avatar` | string (URL or asset path) | yes | Avatar image |
| `discipline` | enum of supported disciplines | yes | Reading discipline |
| `gender` | "male" \| "female" \| "non-binary" | yes | Teller's gender presentation |
| `personality` | object | yes | Voice, humor, emotional register, reframing style |
| `lifeContext` | string[] | no | Aspects of life outside practice (hobbies, opinions, experiences) |
| `activationProfile` | object | yes | Topics, emotional tones, and situations that trigger participation |
| `relationships` | object[] | no | Relationships to other tellers (type + target teller id) |
| `systemPrompt` | string | yes | Full system prompt that defines the teller's behavior for LLM calls |

#### Scenario: Valid teller definition passes validation

- GIVEN a teller definition with all required fields and valid values
- WHEN the definition is validated against the schema
- THEN validation passes with no errors

#### Scenario: Missing required field is rejected

- GIVEN a teller definition without `discipline`
- WHEN the definition is validated
- THEN validation fails with a message identifying `discipline` as missing

#### Scenario: Invalid discipline is rejected

- GIVEN a teller definition with `discipline: "crystal-gazing"`
- WHEN the definition is validated
- THEN validation fails with a message listing valid disciplines

#### Scenario: Duplicate ID is rejected at registration

- GIVEN teller "mira-the-mystic" is already registered
- WHEN a second teller with id "mira-the-mystic" is submitted
- THEN registration is rejected with a duplicate identifier error

---

### ADDED Requirement: Teller registry service

The system SHALL provide a teller registry that loads teller definitions from YAML files at startup, validates them against the schema, and serves them by ID or as a full list.

#### Scenario: Registry loads tellers at startup

- GIVEN three valid teller YAML files exist in the teller definitions directory
- WHEN the registry initializes
- THEN all three tellers are loaded and queryable

#### Scenario: Registry rejects invalid definitions at startup

- GIVEN one teller YAML file is missing a required field
- WHEN the registry initializes
- THEN the invalid teller is rejected with a descriptive error
- AND valid tellers still load

#### Scenario: Teller retrieved by ID

- GIVEN teller "mira-the-mystic" is registered
- WHEN the registry is queried for "mira-the-mystic"
- THEN the full teller definition is returned

#### Scenario: Unknown teller ID returns undefined

- GIVEN the registry is queried for "nonexistent-teller"
- WHEN the lookup executes
- THEN undefined is returned (no error thrown)

#### Scenario: Full teller list is available

- GIVEN three tellers are registered
- WHEN the registry list is requested
- THEN all three teller definitions are returned

---

### ADDED Requirement: Teller YAML definition format

Teller definitions SHALL be stored as YAML files in a designated directory, one file per teller, with a `teller` top-level key.

#### Scenario: YAML file is parsed into a valid teller object

- GIVEN a well-formed teller YAML file
- WHEN the file is loaded and parsed
- THEN the result matches the teller schema with no validation errors

#### Scenario: Malformed YAML is caught gracefully

- GIVEN a teller YAML file with invalid YAML syntax
- WHEN the file is loaded
- THEN a parse error is logged with the filename
- AND the teller is not registered
