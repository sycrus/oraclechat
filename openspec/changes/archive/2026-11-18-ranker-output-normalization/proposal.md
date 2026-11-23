## Intent

Keep the local-model group ranker usable when a model returns a valid score array with omitted metadata or surrounding explanation.

## Why now

Live group-chat verification showed the local model can omit teller IDs and matched categories, or append text after its JSON. Strict parsing rejected those outputs and stopped the group turn before any teller responded.

## What changes

- Normalize missing IDs using the ordered teller roster and default omitted matched categories to an empty list.
- Extract and validate the first complete JSON score array in the model response.
- Continue rejecting invalid scores, unknown explicit IDs, duplicate IDs, and incomplete rosters.

## Non-goals

- Changing relevance ranking policy, the participation threshold, or teller profiles.
- Adding a hosted provider or a non-model ranking fallback.

ADRs reviewed: ADR-0003, ADR-0007
