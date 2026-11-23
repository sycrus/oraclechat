# Proposal

Rebuild Oracle's interface as **OracleChat**: a 4-bit pixel chat app laid out like WhatsApp, with Sage's and Astra's interactive readings and the video call redesigned to match.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0006, ADR-0008, ADR-0010, ADR-0013, ADR-0015, ADR-0016, ADR-0017, ADR-0018

## Why

ADR-0006 retired the legacy design system and left Oracle's visual design to be specified. The current screens are a placeholder: a sidebar of conversation titles, a welcome page, and readings that stack full-size widgets into the message flow. That is dense on a phone and unfamiliar everywhere. The owner chose a visual direction and approved the mockups on the design canvas (https://claude.ai/artifact/Nef8AhzhJ6TZ47zuSJi5Qo):

- a familiar messaging layout (WhatsApp) so nobody has to learn the app
- a 4-bit pixel look
- compact reading cards that open detail sheets instead of long inline widgets

## What Changes

- **Design system (new ADR-0019).**
  - **Colours:** a limited palette of five navy steps, muted text, light gray and white, plus one accent (gold) and a danger red.
  - **Fonts:** Handjet for body text and Pixelify Sans for the OracleChat wordmark and headings. Both are bundled with the app, not loaded from Google at runtime.
  - **Shapes and icons:** corners step in 4px instead of curving, and icons are drawn on a 16×16 pixel grid. No gradients, blur or emoji in the interface.
- **Layout.**
  - **Desktop:** two panes like WhatsApp Web, with the chat list on the left and the open chat on the right.
  - **Phones:** one pane at a time. The list opens a chat and the back arrow returns to it.
  - **Tabs:** a Chats tab and a You tab.
- **Chat list.**
  - **Rows:** each conversation is one row, like a WhatsApp group: the teller avatar (stacked for a two-teller chat), the conversation title, the last message prefixed with its sender ("Mira: …", "You: …"), and when it was sent.
  - **Search:** a box filters the list by title.
  - **New chat:** a button opens a screen like WhatsApp's: tap a teller to start a one-to-one chat, or choose "New group" to pick two.
  - **Backend:** conversation summaries gain the last message's sender, a short plain-text preview and its time.
- **Chat screen.**
  - **Header:** back, the avatar, the title and member names, a video-call button (one-to-one chats with a callable teller) and a menu with "Delete chat".
  - **Bubbles:** they have stepped tails on the first message of each run. Your messages show a single tick while waiting and a double tick once a teller has replied.
  - **Sender names:** shown on the first bubble of each run, in group chats only.
  - **Composer:** a pixel text field and send button.
- **You tab.** The memory, privacy and birth-details settings move from the modal into this tab, along with "Clear chat history".
- **Interactive readings, restyled.**
  - **Sage's coin toss:** the bubble shows one compact row per line (the line as tossed, its coins and total, and what it becomes), six progress squares and a full-width toss button. The coin explanation hides behind a "?" button.
  - **I Ching reading:** a card shows the primary → relating hexagram. "Line by line" opens a bottom sheet with both hexagrams' meanings, the changing lines, and suggested questions.
  - **Astra's birth details:** the invitation is a small card, and its "Add birth details" button opens the form full screen.
  - **Astra's chart:** a summary card shows a mini wheel, Sun, Moon and rising sign, and the active transits, with "Open full chart". The full chart has the pixel wheel, selectable planets, and Placements, Transits and Aspects tabs.
  - **Tarot:** the spread and card fan keep their behavior and take the new look.
- **Suggested questions.** The I Ching sheet and the full chart offer a few questions built from the reading. Tapping one sends it as your message.
- **Video call.**
  - **Screen:** the teller fills the screen with a pixel filter, meaning the render is drawn at low resolution and every pixel snapped to a fixed 16-colour palette.
  - **Controls:** a top bar with name and status, and a bottom row of pixel controls: messages, mic, end.
  - **Typing:** the message button opens the existing typed input over the video. Typing in a call already works; only its placement changes.

## Capabilities

### New Capabilities
- `interface-design`: the palette, fonts, shapes, icons, contrast and layout rules every screen follows.

### Modified Capabilities
- `chat`: the desktop and phone layout, the chat list rows and their last-message preview, new-chat and group creation, the chat header, bubble grouping, ticks and sender names, the You tab, and suggested questions.
- `interactive-readings`: how the coin toss is laid out (the toss rules are unchanged).
- `iching`: how a completed casting is shown (card plus line-by-line sheet).
- `birth-details`: the inline form becomes an invitation card that opens a full-screen form. Depends on `add-astrology-teller` being archived first.
- `astrology`: chart display becomes a summary card and a full chart view. Depends on `add-astrology-teller` being archived first.
- `voice-calls`: the call screen layout and the pixel filter on the teller render.

## Non-goals

- The Updates tab, a call-history tab, archived chats, unread counts and Favourites (left out until each is specified).
- One ongoing thread per teller. Conversations stay separate, as WhatsApp groups are.
- New in-call behavior, such as showing chat history inside the call or text replies while a call is running. Only the existing typed input moves.
- A light theme.
- Changing any reading's rules, payloads or privacy behavior.

## Impact

- **Frontend:** a new design system (CSS tokens in `globals.css`, bundled fonts, `icons.tsx`). `chat-workspace.tsx` is split into chat-list, chat-view, new-chat and you-panel components, and every reading component is restyled. The call overlay view is restyled and `vrm-stage.ts` gets a palette-quantize render pass.
- **Backend:** `ConversationSummary` gains `lastMessage` (store query and type). It is additive, and existing clients ignore it.
- **Docs:** ADR-0019, and its entry in the ADR index.
