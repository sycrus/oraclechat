# ADR-0001: Oracle product boundary and source of truth

**Status:** Accepted
**Date:** 2026-11-17
**Supersedes:** None

## Context

This repository grew out of an earlier, unrelated chat prototype. Legacy code, README content, and older planning documents still describe that prototype. Oracle's behavior is captured in OpenSpec.

## Decision

`openspec/specs/` is the source of truth for Oracle product requirements. The earlier prototype is a reference for reusable engineering patterns, not a source of Oracle product behavior. When legacy docs or code conflict with Oracle OpenSpec, OpenSpec governs new Oracle work.

## Consequences

- New behavior changes start from an OpenSpec requirement or add one before implementation.
- Designs may reuse transport, persistence, component-registry, observability, or testing patterns from the legacy implementation when they fit Oracle.
- Prototype-specific intents, personas, data, and visual branding are not copied into Oracle without a new product decision.

## Validation

Each OpenSpec proposal records the ADRs reviewed. Reviewers confirm that Oracle scenarios trace to `openspec/specs/` and that legacy prototype behavior is not treated as an unstated requirement.
