# Proposal

Bring the memory and chat specs in line with how OracleChat already stores conversations and memories, and record the parts that were only in code.

## Why

ADR-0012 removed saved memories from routing, but the memory spec and ADR-0009's index entry still say the ranker receives them. Three behaviours were never specified at all: the memory distiller sees only the user's last three messages, history beyond the token budget is dropped rather than summarised, and a teller reply is saved only once it finishes streaming. Readers of the specs (and the upcoming eval arena) get a wrong or incomplete picture.

## What Changes

- **Memory spec:** recall supplies memories to tellers only, and the router gets none (matching ADR-0012 and the orchestration spec). Extraction receives only the user's three most recent messages and no teller replies.
- **Chat spec:** history is rebuilt from stored messages for every reply, and messages beyond the budget are dropped, not summarised. A new requirement covers when messages are saved: the user message before routing, a teller reply only when its stream completes, an interrupted reply not at all, with no mid-run checkpoint or resume.
- **ADR index:** ADR-0009's entry notes that its ranker clause was superseded by ADR-0012, following the ADR-0007/ADR-0008 precedent.
- **Characterisation tests** for the two behaviours that had none (the distiller's window, the interrupted reply).
- **`docs/architecture.md`:** a new overview of a turn, routing, history and memory, linking to the specs and ADRs.

No runtime behaviour changes.

## Capabilities

### Modified Capabilities
- `memory`: relevance-filtered recall (no router), relevant fact extraction (input window).
- `chat`: bounded teller history (no summarisation); new "Messages are saved when complete".

## Non-goals

- Summarising dropped history, mid-reply checkpointing or resuming.
- Widening the distiller's window or moving vectors to pgvector.
- Editing ADR bodies.

## Impact

- `openspec/specs/memory/spec.md`, `openspec/specs/chat/spec.md`, `docs/adr/README.md`, new `docs/architecture.md`.
- Tests: `backend/agent/tests/memory/extractor-window.test.ts` (new), one case in `backend/agent/tests/chat/service.test.ts`.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0008, ADR-0009, ADR-0012, ADR-0014
