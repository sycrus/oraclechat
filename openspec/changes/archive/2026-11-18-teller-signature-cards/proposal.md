## Intent

Give each teller a distinct reading niche and make their written persona actually reach the model.

## Why now

Mira and Sage receive identical input: the same spread, history and catalog meanings. Their `personality` and `lifeContext` fields are validated but never sent to the model, so the only difference between them is a hand-written system prompt. In group readings the two replies converge.

## What changes

- **Signature cards.** Each teller definition names an app-owned signature card that the teller draws in addition to the shared spread. Mira draws an **action** card (the next concrete step). Sage draws a **shadow** card (what sits beneath the surface). The application draws the card from the cards left after the shared spread, so it never duplicates a spread card or the other teller's card. The teller only interprets it.
- **Reading lens.** Each signature card carries a lens: instructions on how that teller reads the whole spread through its niche.
- **Persona in the prompt.** The teller's instructions are built from `personality`, `lifeContext`, the signature lens, relationships and `systemPrompt`.
- The signature card is streamed with `message_start`, persisted on the teller's message, and shown at the top of that teller's reply.

## Non-goals

- New disciplines, spreads or catalogs (issue #8).
- Model-invoked tool calls. Draws stay application-owned.
- Letting the user choose or disable signature cards.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0007, ADR-0008
