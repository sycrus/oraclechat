## Intent

Make the tellers reply like people in a chat: short, conversational messages instead of essays.

## Why now

Live replies run 980–3,900 characters (about 170–700 words), with card-by-card headings even for casual chat. The owner: "they are way too verbose, no one chats like that."

## What changes

- Teller instructions gain a **reply style** rule that is shared by all tellers and sits above the per-teller persona.
  - **Chat turns** (no cards): 1–3 short sentences, about 50 words at most, no headings or lists, and at most one question.
  - **Reading turns**: a few short paragraphs, about 120 words in total. Weave the cards together rather than giving each its own section; no headings; one takeaway.
- The per-turn notes repeat the right length limit, so it sits next to the request.
- The MVP teller system prompts are trimmed of instructions that push length ("Explain each card's meaning…").

## Non-goals

- Hard token caps that cut replies mid-sentence (the paragraph bubbles already break up longer text).
- A user-facing length setting.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0008
