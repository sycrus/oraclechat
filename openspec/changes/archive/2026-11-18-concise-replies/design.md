## Context

`buildTellerInstructions` composes the system prompt, persona, life-detail rule, signature lens and relationships. Each YAML `systemPrompt` asks the teller to "Explain each card's meaning briefly, connect it to the user's situation, and end with an actionable reflection" (Mira), or something similar (Sage). With thinking off, the local model expands this into card-by-card sections. Conversation turns add `NO_DRAW_NOTE`; reading turns add the draw JSON.

## Decision

- **Reply style.** `buildTellerInstructions` adds a fixed block:
  "Reply style: this is a chat, not an essay. Write like a friend texting. Without cards: 1–3 short sentences (about 50 words at most). With a reading: a few short paragraphs, about 120 words in total. Weave the cards together instead of covering each one in turn. No headings, no bullet lists, no bold card titles, and at most one question."
- **Per-turn reminders.**
  - `NO_DRAW_NOTE` adds "Keep it to 1–3 short sentences."
  - The reading context adds "Keep the whole reply around 120 words."
- **YAML.** In both prompts, the sentence about explaining each card becomes "Connect the cards to the user's situation and leave them with one useful reflection or question." Persona content is unchanged.

Rejected:
- `max_tokens`, which truncates mid-thought.
- Post-processing or summarising output, which needs an extra model call.

## Verification

Test-first:
- The instructions contain the reply-style block for every teller.
- The no-draw note and the reading context each carry their length reminder.

Then live, over 3 conversation turns and 2 reading turns: median reply length should be at most about 60 words on conversation turns and about 160 on readings, with no `#` headings or `**Card**` titles, and the tellers should stay in character.

## ADR alignment

- ADR-0002 and ADR-0003: prompt-only change, with no model or orchestration change.
- ADR-0008: both tellers still reply, just shorter.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0008
