# Design

## Context

The frontend is a Next.js 14 app. Its main pieces today:

- **`chat-workspace.tsx`:** one 374-line component holding all state (conversations, the active chat, streaming, memory and birth-details settings, the call) and all markup.
- **`globals.css`:** about 400 lines of styles, on top of Tailwind's base.
- **Reading components:** `coin-toss.tsx`, `chart-wheel.tsx`, `birth-details-form.tsx`, `card-fan.tsx` and `message-body.tsx`, each tested with `renderToStaticMarkup`.
- **The call:** `call/call-overlay.tsx` holds the state, `call-overlay-view.tsx` the markup, and `vrm-stage.ts` the three.js renderer.

The approved mockups are on the design canvas (https://claude.ai/artifact/Nef8AhzhJ6TZ47zuSJi5Qo): Chats, Chat, Video call, Spec, SageToss, SageReading, AstraInvite, AstraForm and AstraChart.

## Goals / Non-Goals

**Goals:**
- Match the mockups' layout, palette, type and icons.
- Keep every existing behavior and API contract. The only backend change is additive.
- Put the new presentation logic in pure, unit-tested helpers.

**Non-Goals:** the features listed in the proposal's non-goals, a light theme, and changes to reading rules or payloads.

## Decisions

### 1. Tokens and plain CSS over Tailwind
`globals.css` is rewritten around `:root` custom properties: the palette, the 4px step, and classes for the stepped shapes (`.px`, `.px-in`, `.px-out`, `.px-round`, `.tail-in`, `.tail-out`) and the dither. Stepped corners are `clip-path` polygons, so no images are needed.

The `@tailwind base` directive stays, for its reset. The component classes it generated are not used.

*Alternative:* Tailwind utilities with arbitrary values. That would scatter clip-path polygons and tokens across markup, and ADR-0019's colour test is simpler against one stylesheet.

### 2. Bundled fonts via `next/font/local`
Handjet (variable, weights 300 to 700) and Pixelify Sans (variable, 400 to 700) are saved as woff2 files under `src/app/fonts/`, with `OFL.txt` beside them. `layout.tsx` exposes them as the CSS variables `--font-body` and `--font-title`.

*Alternative:* `next/font/google`. It fetches at build time, which fails on an offline build (ADR-0010).

### 3. Icons as data
`src/app/icons.tsx` holds a map from icon name to a 16×16 path string, the same paths as the canvas. `<Icon name size>` renders an `<svg>` with `shape-rendering="crispEdges"`, `fill="currentColor"` and `aria-hidden`. Sizes are 16, 24 or 32 so pixels stay whole on 2× screens. Icon-only buttons carry `aria-label`.

### 4. Splitting the workspace
`chat-workspace.tsx` keeps the state and network calls (the stream reader, `interact`, `send`) and becomes a shell that picks the panes. The markup moves into presentational components, each taking props so it can be rendered in tests:

- `chat-list.tsx`: the list header (wordmark), search, rows and new-chat button
- `new-chat.tsx`: the teller list and the "New group" mode
- `chat-view.tsx`: the header and menu, the message list (bubble runs, ticks, names, readings), the composer and the thinking indicator
- `you-panel.tsx`: the former memory panel's contents as a tab page
- `nav-tabs.tsx`: the desktop rail and the phone bottom bar

The shell tracks `view: "list" | "chat" | "new" | "you"`. A CSS media query at 900px shows the list pane and the chat pane together, and below it shows only the pane `view` names. Opening a chat sets `view = "chat"`, and the back button sets `view = "list"`.

### 5. Pure helpers
| Module | Functions |
|---|---|
| `lib/chat-list.ts` | `timeLabel(iso, now)`, `previewLine(summary, tellers)`, `filterByTitle(list, query)` |
| `lib/thread.ts` | `runs(messages)` (which bubble gets a tail, which shows a name), `tickState(messages, index, awaiting)` |
| `lib/iching.ts` (add) | `trigrams(lines)`, giving the lower and upper trigram names (Heaven, Earth, Thunder, Water, Mountain, Wind, Fire, Lake) |
| `lib/suggestions.ts` | `ichingSuggestions(reading)` and `chartSuggestions(reading, selected)`, three strings each |
| `lib/astrology.ts` (reuse) | `wheelPoint` and `spreadLongitudes` already exist; the full wheel uses a wider minimum gap (13°) |
| `lib/call/palette.ts` | `CALL_PALETTE` (16 colours) and `nearestColour(rgb)` |

`nearestColour` is the reference the shader must match, and is tested against fixed samples.

### 6. Reading cards and sheets
- **`CoinToss`:** rewritten as the compact card. It keeps its props, `aria-live` count, line labels and disabled state. A local `help` state toggles the legend.
- **`IChingView`:** becomes the reading card plus `IChingSheet`, opened by local state. The sheet is a `role="dialog"` bottom sheet over a dither backdrop, and closes on Escape, the backdrop or the close button.
- **`BirthDetailsForm`:** stays a form component. A new `BirthInvite` card renders in the message. Its button opens a `FullScreenSheet` holding the form, which closes on success.
- **`ChartWheel`:** split into `ChartSummary`, the card with the mini wheel, and `ChartView`, the full-screen view with the wheel, planet selection and tabs. The text lists stay in the tabs, which satisfies "Readable without the wheel".

Suggested questions call the workspace's `send(text)`. `send` is refactored to take the text, so the composer and the chips share one path.

### 7. Last message in summaries (backend)
`listConversations` adds a lateral subquery that selects each conversation's newest message: sender type, sender id, content and created time. `previewText(content)` (in `chat/preview.ts`) strips Markdown emphasis, heading and list markers and links, collapses whitespace, and cuts at 80 characters. `ConversationSummary.lastMessage` is optional.

### 8. Pixel filter
`vrm-stage.ts` renders the scene the normal way, but onto a hidden WebGL canvas sized to the stage divided by `BLOCK_PX` (2.5), so a phone-width call is about 160px across. Each frame goes through three steps:

1. `readPixels` reads the frame back.
2. `snapFrame` (in `lib/call/palette.ts`) snaps each pixel to the 16-colour call palette, using `nearestColour` through a 5-bit-per-channel lookup table.
3. `putImageData` draws the result on the visible canvas, and CSS scales that up with `image-rendering: pixelated`.

Pixels under half opacity stay transparent, so the call backdrop (`--line`) shows behind the teller.

*Alternatives tried:* two GPU post-passes. One rendered into a render target and quantized it with a shader; the other copied the framebuffer into a texture for the shader. Each turned one model's textures black (Sage in the first, Astra in the second), so each model's normal render path is kept untouched.

*Cost:* one `readPixels` stall per frame at about 56k pixels, which is negligible.

*Fallback:* without a 2D context on the visible canvas, the stage renders straight to it at full resolution.

### 9. Call screen
`CallOverlayView` keeps its props. The markup changes to a full-bleed stage, a top bar, a subtitle strip and a control row (messages, mic, end), and the typed input moves into a panel toggled by the messages control. The panel defaults to open when `mic` is blocked or listening is offline.

### TDD order
Tests come before each implementation step:

1. Backend preview and summary
2. Pure helpers
3. Icon and design-token tests
4. Component markup tests: list rows, header, runs and ticks, coin toss card, I Ching card and sheet, birth invite, chart summary and view, call view
5. Shell layout last

The design itself is verified by running the app and taking screenshots at 1280px and 390px.

## Risks / Trade-offs

- **Workspace split.** Splitting `chat-workspace.tsx` could break streaming behavior. Mitigation: keep the stream and interaction functions unchanged in the shell, and touch only markup.
- **Handjet is narrow.** Mitigation: a minimum 16px body and 19px messages, checked by eye at 390px.
- **Shader cost.** One quad with 16 distance checks is cheap. The low-resolution target makes the 3D pass cheaper than it is today.
- **Static-markup tests can't click.** Mitigation: interactive state (sheet open, selected planet, help visible, view) is exposed as optional props or initial state, so each state can be rendered.

## Migration Plan

This is a frontend redeploy with an additive API field. No data migration is needed. Rollback is a git revert.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0006, ADR-0008, ADR-0010, ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0018

- **ADR-0006:** this change is the "future change" that specifies Oracle's own design system. It is recorded as ADR-0019 and adds no legacy packages back.
- **ADR-0019:** accepted by the owner before implementation.
- **ADR-0002 and ADR-0010:** fonts are bundled and the pixel filter runs on the GPU locally. No network dependency is added.
- **ADR-0001:** OpenSpec specs stay the source of truth, and the canvas is a reference only.
- **ADR-0008:** group chats keep both tellers responding. Only the presentation changes (names on runs).
- **ADR-0013 and ADR-0017:** reading kinds, payloads and app-owned rules are unchanged. Cards and sheets only change how validated payloads are shown, and suggested questions are ordinary user messages.
- **ADR-0018:** the birth form keeps its consent text, validation and privacy. Only the invitation opens it full screen, and the details never return to the chat.
- **ADR-0015 and ADR-0016:** call turns, voice, mic and speech recognition are unchanged. The pixel filter only post-processes the render, and the framing rules still hold.
