## ADDED Requirements

### Requirement: Teller model comparison eval

An on-demand eval (`eval:models`) SHALL run a fixed set of at least 20 chat cases through the real chat service twice, once with local teller replies and once with hosted replies. Both runs SHALL reuse the same local routing result per turn. Each teller reply SHALL be checked for:
- use of the app-owned reading when one was given;
- no invented cards, hexagrams or chart placements;
- staying in character;
- in pair chats, whether the expected teller gave the reading.

The eval SHALL write a JSON result and a Markdown summary with transcripts. It SHALL NOT run as part of `pnpm test`, and it SHALL NOT use the OpenAI Evals product.

#### Scenario: Both arms see the same routing
- **WHEN** the eval runs a case on the local and the hosted arm
- **THEN** the routing model is called once per turn, and both arms use its result

#### Scenario: Invented card is flagged
- **WHEN** a tarot reply names a card that is not in this turn's draw, an earlier reading, or the user's message
- **THEN** the reply fails the invented-items check and the card is listed

#### Scenario: Wrong teller reads in a pair
- **WHEN** a pair case expects only Mira to read and Sage's reply carries a reading
- **THEN** the case fails the right-teller check

#### Scenario: Not part of the test suite
- **WHEN** `pnpm test` runs
- **THEN** no eval case runs and no model is called
