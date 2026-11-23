## Context

- `ChatService.sendMessage(conversationId, content, emit, spreadType?)` always calls `drawSpread(spreadType)`, which defaults to three cards. It persists the spread on the user message, emits `tarot_spread`, and draws signature cards for the responders.
- The teller input always ends with the draw JSON and the signature card JSON.
- `POST /api/conversations/:id/messages` accepts `spread` as `"one-card"`, `"three-card"`, or nothing.
- The UI's spread `<select>` defaults to three cards and keeps its value between sends.

## Decision

- **Type.** The spread choice becomes `TarotSpreadType | "none"`. Omitting it means `"none"`. `drawSpread` keeps its own three-card default for callers that do draw.
- **ChatService, draw turn** (`one-card` or `three-card`): behaviour is unchanged.
- **ChatService, conversation turn** (`none`):
  - no spread is drawn, persisted or emitted;
  - no signature cards are drawn, and `message_start` has no `card`;
  - the teller input is the history plus this note: `No cards were drawn for this message. Continue the conversation in character: answer, role-play, or go deeper into earlier readings. Do not invent, draw or describe new cards; if a reading would help, you may suggest the user draw cards.`
  - When the conversation has an earlier reading, the input adds `Most recent reading in this conversation (for reference): <spread JSON>` and, when this teller has one, `Your most recent signature card (for reference): <card JSON>`. Both are found by scanning the persisted messages.
- **API.** The route accepts `spread` as `"none"`, `"one-card"`, `"three-card"`, or omitted; anything else is a 400.
- **UI.**
  - The select offers *No cards* (default), *One card* and *Three cards*, labelled "Cards".
  - After each send it resets to *No cards*, and `spread: "none"` is sent explicitly.
  - The thinking indicator reads "Your tellers are thinking" or "Thinking" on conversation turns, and "…reading the cards" on draw turns.
- **Tracing.** `oracle.turn.spread` is set to `"none"` on conversation turns.

Rejected:
- **A model-callable draw tool.** Draws stay user-initiated and app-owned (ADR-0002, ADR-0003), and local tool calling is unreliable.
- **Keeping the last spread choice sticky.** It reintroduces accidental draws on follow-ups.

## Verification

Test-first:
- ChatService:
  - a `none` turn emits no `tarot_spread`, persists no reading, gives `message_start` no card, and its teller input carries the no-draw note and no new draw;
  - a later `none` turn includes the earlier spread and the teller's own last signature card as references;
  - an omitted spread behaves like `none`;
  - a draw turn is unchanged.
- API: `spread: "none"` is accepted, and an invalid value is a 400.
- UI: the composer default is `none` and resets after send (a pure helper), and the indicator wording depends on whether cards were drawn.

Then run a live conversation turn followed by a draw turn.

## ADR alignment

- ADR-0002 and ADR-0003: draws remain application-owned and are triggered only by an explicit user choice; tellers never draw.
- ADR-0004: spans gain only `"none"` as a spread value.
- ADR-0008: both tellers still respond on every turn.
- ADR-0001 and ADR-0007: single-user product scope is unchanged. The PRD's "three-card is the default" line is updated to say draws are chosen per message, with three cards preselected in the draw options.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
