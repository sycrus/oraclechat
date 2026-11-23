# ADR-0005: Remove legacy prototype runtime

**Status:** Accepted
**Date:** 2026-11-17
**Supersedes:** ADR-0003 legacy-code-retention consequence

## Context

The repository's executable UI and agent runtime were built for an earlier, unrelated chat prototype. Oracle is a separate product defined by OpenSpec, and its target runtime and local-first infrastructure differ from the old implementation. Keeping the prototype application active makes the product boundary unclear and encourages new work to extend code that Oracle will replace.

## Decision

Remove prototype-specific UI, prompts, datasets, agent runtime, and service configurations from the active source tree. Preserve reusable modules that remain aligned with Oracle decisions, including the teller schema and registry, storage-independent memory types, OpenTelemetry integration, and generic chat and design-system primitives. Preserve historical product and implementation documentation as reference. Use Git history for the removed implementation code.

## Consequences

- The frontend becomes a minimal Oracle placeholder until Oracle UI behavior is specified and implemented.
- The previous prototype agent server is removed; Oracle's Agents SDK runtime will be implemented from OpenSpec in its own change.
- Legacy Mem0 and LlamaIndex services are removed from the local Compose stack. Local Postgres and optional Langfuse remain.
- Existing Oracle features must not depend on prototype prompts, data, personas, or cards.

## Validation

The build must have no imports to removed prototype modules. The active app, package scripts, Docker Compose file, ADR checker, and retained teller tests must reference only active Oracle or reusable modules. Historical docs may retain prototype terms when clearly labeled as historical reference.
