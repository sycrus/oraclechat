## Context

The Agents SDK sends a local model prompt for one score per teller. The model is not guaranteed to obey the requested JSON shape, even when it returns the correct number of scores. The runtime must preserve the approved local-model ranking policy while mapping the result back to the exact eligible roster.

## Decision

Extract the first complete JSON array from the model response. Validate every score, use roster order only when an ID is omitted, and treat omitted matched categories as empty. Keep explicit IDs authoritative and reject unknown or duplicate IDs, malformed scores, and incomplete arrays.

## Verification

Use test-first cases for omitted metadata and trailing explanation, then verify both 1:1 and group chat against local PostgreSQL and Ollama.

## ADR alignment

The implementation complies with the accepted Agents SDK and application-owned local ranking decisions; it only normalizes local-model output before participation policy is applied.

ADRs reviewed: ADR-0003, ADR-0007

