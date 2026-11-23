## Tasks

### 1. Schema definition (TDD)
- [x] 1.1 Write test: valid teller definition passes Zod validation
- [x] 1.2 Write test: missing required field fails validation
- [x] 1.3 Write test: invalid discipline enum fails validation
- [x] 1.4 Write test: duplicate ID detection (separate from schema — registry-level)
- [x] 1.5 Implement `TellerDefinition` type and `tellerDefinitionSchema` in `backend/agent/src/tellers/schema.ts`

### 2. Teller registry (TDD)
- [x] 2.1 Write test: registry loads valid tellers from directory
- [x] 2.2 Write test: registry skips invalid definitions with logged error
- [x] 2.3 Write test: registry rejects duplicate IDs
- [x] 2.4 Write test: registry.get returns teller by ID
- [x] 2.5 Write test: registry.get returns undefined for unknown ID
- [x] 2.6 Write test: registry.list returns all loaded tellers
- [x] 2.7 Implement `TellerRegistry` class in `backend/agent/src/tellers/registry.ts`

### 3. YAML definition format (TDD)
- [x] 3.1 Write test: valid YAML file parses into teller definition
- [x] 3.2 Write test: malformed YAML is caught and logged
- [x] 3.3 Write test: YAML missing top-level `teller` key is rejected
- [x] 3.4 Add `yaml` package dependency
- [x] 3.5 Implement YAML loading in registry (file read → parse → validate → register)

### 4. First teller definition (TDD)
- [x] 4.1 Write test: mira.yaml loads and validates successfully via registry
- [x] 4.2 Write test: mira.yaml has expected field values (discipline=tarot, gender, etc.)
- [x] 4.3 Create `backend/agent/src/tellers/definitions/mira.yaml` — a valid tarot teller for testing

### 5. Server integration (TDD)
- [x] 5.1 Write integration tests: registry loads at startup and `GET /tellers` returns loaded teller IDs
- [x] 5.2 Initialize `TellerRegistry` in `backend/agent/src/server.ts` at startup
- [x] 5.3 Add `/tellers` endpoint for development visibility (not a production API)

### 6. ADR alignment
- [x] 6.1 Record ADR-0001, ADR-0003, ADR-0005, and ADR-0007 review in the proposal and design
- [x] 6.2 Record the previous LangGraph server wiring as removed under ADR-0005 and preserve Agents SDK integration for a separate change
