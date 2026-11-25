# Design

## Context

The code is the reference here. `ChatService.runTurn` and `replyAs` (`backend/agent/src/chat/service.ts`) save the user message before routing and save a teller reply after `options.stream` resolves. `boundHistory` (`chat/history.ts`) keeps the newest lines within the budget and prefixes an omission marker. `extractMemoryOperations` (`memory/extractor.ts`) slices `userMessages` to the last three. `routeTurn` (`orchestration/router.ts`) sends tellers, previous replies and the message, with no memories, as ADR-0012 decided.

## Goals / Non-Goals

**Goals:** specs that match the code, a test for every newly specified scenario, and one overview document that survives change archiving.

**Non-Goals:** any runtime change (see proposal.md).

## Decisions

1. **Specs only follow the code.** Where the memory spec says "ranker", ADR-0012 and the orchestration spec ("Memories never reach the router") win, because they are later and Accepted.
2. **No new ADR.** ADR-0012 already records "No memories in routing". The README index entry for ADR-0009 gets a note, as ADR-0007's does for ADR-0008. ADR bodies stay unedited.
3. **`docs/architecture.md`** is descriptive and points to the specs and ADRs as the source of truth, so it can't silently become a second spec. It holds the turn diagram from the guardrails change (without the guardrail steps, which aren't built yet).

### Reused vs new
Reused: the existing tests for the history budget (`tests/chat/history.test.ts`), routing without memories (`tests/runtime/thinking.test.ts`, `tests/orchestration/router.test.ts`) and recall (`tests/memory/recall.test.ts`). New: `tests/memory/extractor-window.test.ts` and the interrupted-reply case in `tests/chat/service.test.ts`.

### TDD order
These are characterisation tests for existing behaviour, so they pass on the first run rather than failing first. They were written before the spec text and run to confirm the code matches it.

## Risks / Trade-offs

- [The overview drifts from the code] → It links to specs and ADRs for detail, and the tasks of future changes that touch routing, history or memory should update it.

## Migration Plan

None. Docs and tests only.

## ADR alignment

ADRs reviewed: ADR-0002, ADR-0003, ADR-0008, ADR-0009, ADR-0012, ADR-0014

- **ADR-0009:** its recall design is unchanged. Only its ranker clause is marked as superseded by ADR-0012 in the index.
- **ADR-0012:** the memory spec now matches its "No memories in routing".
- **ADR-0002 / ADR-0014:** extraction and history building stay local. Nothing new is sent to a hosted model.
- **ADR-0003 / ADR-0008:** described in the overview as they stand (app-sequenced single runs, both tellers reply).
