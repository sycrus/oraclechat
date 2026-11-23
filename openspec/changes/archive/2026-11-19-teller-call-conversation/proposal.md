## Intent

Let the owner talk with Mira in a video call: what they type goes into the conversation, and Mira answers aloud, one sentence at a time, with matching expressions.

## Why

Milestone 1 proved the voice, 3D model and call state machine with sentences Mira repeats word for word. The point of a call is a conversation, so the call now has to use the real teller pipeline (routing, memory, readings) and speak its replies as they stream.

## What Changes

- **Call messages.** In the overlay, a typed message is sent to the conversation with a `call` flag. It is saved, routed and remembered like any chat message, and the reply appears in the chat transcript afterwards.
- **Spoken replies.** With the flag, the teller gets a turn note asking for spoken-style replies (no markdown, lists or links) that start each sentence with an emotion tag. The backend splits the streamed reply into sentences, removes the tags, and emits `sentence` events (`text`, `expression`) that the overlay speaks in order.
- **Clean transcript.** Saved replies and the streamed chat text never contain the tags.
- **Expressions.** `[happy]`, `[relaxed]`, `[surprised]` and `[sad]` set Mira's face while she speaks that sentence; no tag or an unknown one means neutral.
- **Thinking.** Between sending and her first spoken sentence Mira is in a `thinking` state: hand near her chin, looking away from the camera, "…" as the subtitle.
- **Readings in a call.** If she draws cards, they are saved to the chat as usual, and the overlay shows "Mira drew N cards — see chat".
- **Debug mode.** The M1 say-it-verbatim box remains behind `?say=1`.
- Reply length rules are unchanged. With hosted replies on (ADR-0014), the text is hosted and the voice stays local (ADR-0015).

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `voice-calls`: the call talks to the conversation, spoken sentences carry expressions, a thinking state, readings in a call, and verbatim speech becomes a debug mode.

## Non-goals

- Voice input, speech recognition or interrupting Mira.
- Cards rendered inside the call overlay.
- Calls in group conversations or with Sage.
- Animation clips (`.vrma`): the thinking pose is posed in code.
- Changing reply length, routing or memory behavior.

## Impact

- Backend: `sendMessage` options (`call`), a sentence and tag splitter, a `sentence` chat event, and a `call` field on `POST /api/conversations/:id/messages`.
- Frontend: overlay talks to the messages endpoint and parses its stream; call state machine gains `thinking` and per-sentence expressions; the stage gains a thinking pose and expression blending; the chat reloads the conversation after a call turn.

ADRs reviewed: ADR-0002, ADR-0004, ADR-0008, ADR-0009, ADR-0012, ADR-0014, ADR-0015
