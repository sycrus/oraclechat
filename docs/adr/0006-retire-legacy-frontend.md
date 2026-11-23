# ADR-0006: Retire legacy frontend and design system

**Status:** Accepted
**Date:** 2026-11-18
**Supersedes:** ADR-0005 frontend primitive-retention consequence

## Context

The existing React chat interface and generative UI package were designed for an earlier, unrelated chat prototype. Oracle's product specs define a different chat experience and its visual design has not yet been specified. Keeping the old UI components as defaults would turn an unrelated product design into an implicit Oracle requirement.

## Decision

Remove the legacy chat components, generative UI components, design-system package, and frontend runtime helpers. Keep only the Next.js application scaffold and a clearly labeled Oracle placeholder. Build Oracle's actual frontend and design system from OpenSpec in future changes.

## Consequences

- The frontend workspace remains a Next.js/React shell but has no chat transport or product UI.
- Oracle's UI behavior and component contracts must be specified before implementation.
- Historical frontend design and behavior remain available in Git history and historical docs only when they are still relevant.

## Validation

The active frontend must build without importing the removed design-system package or legacy chat modules. Workspace package definitions, root scripts, and lockfile importers must no longer include the removed frontend package or its unused direct runtime dependencies.
