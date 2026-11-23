# ADR-0003: Agents SDK orchestration

**Status:** Accepted
**Date:** 2026-11-17
**Supersedes:** None

## Context

Oracle's group-chat behavior needs per-teller relevance decisions, separately attributed replies, response ordering, and awareness of earlier tellers' replies. A generic single-agent handoff does not by itself express those product rules. The current implementation uses LangGraph and includes Parlant scaffolding from the earlier stack.

## Decision

Use the OpenAI Agents SDK for TypeScript as Oracle's agent runtime. Application code owns teller selection, ordering, and group-chat sequencing; each teller's response remains attributable to that teller. LangGraph and Parlant are not part of Oracle's target request path. Preserve useful legacy code as reference until each Oracle flow is migrated.

## Consequences

- A compatibility layer adapts Agents SDK stream events to the existing AG-UI SSE client until the UI transport changes by a separate decision.
- Teller runs receive prior teller responses when required by the group-chat spec.
- The current Zod v3 dependency must be reconciled with the Agents SDK's Zod v4 requirement before integration.
- Existing LangGraph and Parlant code may remain in the repository as legacy reference during migration.

## Validation

Tests prove group selection and ordering, one-to-one response behavior, per-teller message attribution, and that later tellers receive earlier replies. A source review confirms new Oracle request paths use the Agents SDK and do not add new dependencies on LangGraph or Parlant.
