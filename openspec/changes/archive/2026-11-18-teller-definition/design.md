## ADR alignment

ADRs reviewed: ADR-0001, ADR-0003, ADR-0005, ADR-0007

- This change establishes the Oracle teller contract, consistent with ADR-0001.
- The previous server integration used LangGraph and was removed under ADR-0005. The schema and registry remain reusable; a separate change will integrate them with the Agents SDK target runtime.
- ADR-0007 sets the MVP ranking policy: application-owned local-model scoring, not Parlant. This schema change supplies the activation profile inputs; scoring remains a separate orchestration behavior.

## Approach

### Teller definition type + Zod schema

New file: `backend/agent/src/tellers/schema.ts`

- Define a `TellerDefinition` TypeScript type
- Define a matching Zod schema (`tellerDefinitionSchema`) for runtime validation
- The `discipline` enum: `tarot`, `i-ching`, `astrology`, `rune-casting`, `numerology`, `palmistry`, `tea-leaves`, `stoic-counsel`
- The `activationProfile` object: `{ topics: string[], emotionalTones: string[], situations: string[] }`
- The `personality` object: `{ voice: string, humor: string, emotionalRegister: string, reframingStyle: string }`
- The `relationships` array: `{ targetTellerId: string, type: "rapport" | "friction" | "mentorship" }[]`

### Teller registry service

New file: `backend/agent/src/tellers/registry.ts`

- `TellerRegistry` class with `loadFromDirectory(dir: string)`, `get(id: string)`, `list()`, `validateAndRegister(definition: unknown)`
- Loads YAML files from a directory at server startup
- Each file has a `teller` top-level key containing the definition
- Invalid definitions are logged and skipped (not crash the server)
- Duplicate IDs are rejected

### Teller definition directory

New directory: `backend/agent/src/tellers/definitions/`

- One YAML file per teller
- First file: `mira.yaml` — a working example teller (tarot discipline) for testing
- Not the final character design — just a valid, loadable instance

### Historical server integration (removed under ADR-0005)

- `backend/agent/src/server.ts` initializes the registry at startup and exposes it for development visibility
- Future Oracle orchestration changes use the Agents SDK and pass the registry through runtime context

### TDD approach

Write tests first in `backend/agent/tests/tellers/`:
1. Schema validation tests (valid definition, missing fields, invalid enum values)
2. Registry tests (load from directory, reject duplicates, skip invalid files, get by ID, list all)
3. YAML parsing tests (valid YAML, malformed YAML, missing top-level key)

### Reuse from existing codebase

- Zod is already a dependency
- Express server startup pattern already exists in `server.ts`
- Test infrastructure (Vitest) already configured
- YAML parsing: add `yaml` package (or `js-yaml`) — lightweight, no alternatives already in the project
