# Original tarot content and visual design

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007

## Design

- Keep the canonical 78-card deck in a pure local catalog. Every entry provides separate upright and reversed copy plus a stable illustration key.
- The app-owned draw selects the orientation-specific interpretation and passes that exact card object to tellers, storage, SSE, and the UI.
- Render original SVG motifs in the frontend: symbolic scenes for Major Arcana and suit palettes/symbols with rank pips for Minor Arcana. No external image host is required.
- Document naming, copy, and artwork provenance. Original copy does not reproduce guidebook passages.
- Use mobile drawer navigation so conversation switching remains available at narrow widths; keep focus indicators and accessible SVG names.

## TDD seams

- Catalog seam: tests verify 78 unique entries, both orientations, no placeholder content, and provenance metadata.
- Draw seam: tests verify actual catalog copy and stable art keys are selected by orientation.
- Renderer seam: server-rendered component tests verify accessible SVG labels, distinct scenes, and reversed state.
- UI seam: frontend production build checks responsive UI types and route integration.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0007

- The content and art remain local and discipline-specific, following the local-first tarot MVP boundary in ADR-0007.
