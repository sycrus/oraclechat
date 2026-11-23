## Intent

Make tarot draws something the user asks for, not something every message triggers. A chat can be plain conversation, role-play, or a request to go deeper into an earlier reading.

## Why now

Every message currently draws a three-card spread plus a signature card for each teller. Follow-ups such as "tell me more about the Tower" or casual role-play get a fresh, unrelated draw, which buries the conversation in cards and makes the tellers interpret new cards nobody asked for.

## What changes

- **No draw by default.** The composer's spread menu becomes **No cards / One card / Three cards**, defaulting to *No cards*, and resets to *No cards* after each send. The API treats a missing `spread` as no draw and also accepts `"none"`.
- **Draw turns** are unchanged: a shared spread plus one signature card per responding teller.
- **Conversation turns** (no draw) have no spread and no signature cards. Tellers are told no cards were drawn and must not invent a draw; they may suggest drawing if a reading would help. For reference they receive the conversation's most recent spread and their own most recent signature card, so they can expand on earlier readings.
- The thinking indicator says "thinking" rather than "reading the cards" on conversation turns.
- Traces record `oracle.turn.spread = "none"`.

## Non-goals

- Letting the model decide to draw (draws stay user-initiated and app-owned, ADR-0002/0003).
- New spreads (#7).
- Changing how draw turns work.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
