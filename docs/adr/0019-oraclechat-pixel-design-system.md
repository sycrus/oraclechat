# ADR-0019: OracleChat pixel design system and messaging layout

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** None (fills the design-system gap ADR-0006 left open)

## Context

ADR-0006 removed the legacy design system and said Oracle's own UI must be specified before it is built. The interface has since grown readings (tarot fans, coin tosses, charts), a birth-details form and video calls on a placeholder layout. Inline widgets crowd the message flow, especially on a phone. The owner approved a direction on a design canvas: a 4-bit pixel look, and a layout copied from a mainstream messaging app so it needs no learning.

## Decision

- **Layout.** Oracle's interface is a messaging app in WhatsApp's pattern:
  - a chat list with one row per conversation; two-teller conversations look like groups
  - an open chat with bubbles, tails and ticks, and a header with back, avatar, members, call and menu
  - a new-chat screen with "New group", and a You tab for settings
  - two panes from 900px wide, one pane below that
- **Readings.** Interactive readings appear as compact cards in the message flow. Detail opens in a bottom sheet or a full-screen view, never as a long inline widget.
- **Palette.** One fixed set of tokens: five navy steps (night, panel, raised, line, mine), dim, muted, gray and white, one accent (gold `#e8c35a`) and a danger red. Dark only. No gradients, blur, translucency or soft shadows. Backdrops are pixel dithers.
- **Type.** Handjet for body text and Pixelify Sans for the wordmark and titles. Both are bundled locally under the OFL; there are no runtime font requests.
- **Shapes and icons.** Corners step in 4px. Icons are hand-drawn on a 16×16 grid in one module, never emoji.
- **Video.** The teller's render is pixelated and snapped to a fixed 16-colour call palette.

## Consequences

- **Consistency.** Every new screen and reading kind must fit the palette, type and card-plus-sheet pattern. A new colour or font needs a superseding ADR.
- **Delivery.** Fonts ship in the repository (licence files included), so the app stays usable offline (ADR-0002, ADR-0010).
- **Styling.** Tailwind's generated theme is no longer the source of styling. Components use the CSS tokens and classes in `globals.css`.
- **Excluded features.** Features WhatsApp has but Oracle does not specify (Updates, call history, archive, unread, favourites) stay out until a change specifies them. The layout must not show inactive placeholders for them.
- **Readings.** Cards reduce what each reading shows inline, so each kind needs a defined summary and a detail view.

## Validation

- **Colours.** A unit test reads `globals.css` and fails on any colour literal outside the token list.
- **Fonts.** A test checks that `layout.tsx` loads fonts only through `next/font/local` from bundled files.
- **Icons.** Component tests check that every icon-only button has an accessible name and that no emoji appear in UI strings.
- **Review.** Changes that add screens or reading kinds cite this ADR in their OpenSpec design.
