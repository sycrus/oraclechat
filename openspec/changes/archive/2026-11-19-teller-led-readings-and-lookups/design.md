## Context

- `ChatService.sendMessage(conversationId, content, emit, spreadType, webSearch)` draws one tarot spread or I Ching casting before the turn, stores it on the user message, and gives it to every teller. It draws one signature card per teller (`action` for Mira, `shadow` for Sage) and runs the user-triggered search.
- Group order comes from `rankGroupTellers` (local JSON call via `runLocalAgent`, Zod-parsed) with a least-recently-spoken fallback. Both tellers always reply (ADR-0008).
- Teller definitions (`tellers/definitions/*.yaml`, `tellers/schema.ts`) require `discipline` and `signatureCard { position, lens }`. Both tellers are `tarot`.
- Messages have JSONB columns `reading`, `signature_card` and `search`. Turns without a draw get the latest reading and the teller's latest signature card as reference.

## Decision

- **Turn router** (replaces `rankGroupTellers` in `orchestration/ranker.ts`, renamed `orchestration/router.ts`): `routeTurn({ tellers, previousReplies, message }, config?) => Promise<TurnRoute[]>`, where `TurnRoute = { tellerId; score; matchedCategories; reading: "named" | "unnamed" | "none"; spread?: TarotSpreadType; query?: string }`.
  - One `runLocalAgent` call per turn, thinking off, for one-to-one and group chats.
  - Input: each teller's id, name, discipline and activation profile; the previous turn's teller replies (text only, each truncated to 600 characters); the message. No memories.
  - The prompt keeps the scoring rules and adds the `named`/`unnamed`/`none` rules. A user-requested spread wins, otherwise a fitting one. It asks for a search only when current facts or data would clearly help that teller.
  - `validateRouterResponse` extends `validateRankerResponse`: one entry per teller, known unique IDs, unknown categories dropped. A missing or invalid `reading` becomes `none`. `spread` is kept only for tarot tellers, with `three-card` as the default for a reading. `query` is trimmed, capped at 200 characters and dropped when empty.
  - On any failure the service uses score 0 and `reading: "none"` for every teller, as the ranker fallback does today.
  - `selectGroupResponders` is unchanged.
  - Span `oracle.orchestration.route`: per teller, score, categories, `reading`, `spread`, and `lookup` (boolean).
- **Who reads.** After routing, the service orders tellers with `selectGroupResponders`. A teller reads if its route is `named`, or `unnamed` and it is first in order. The draw follows the teller's discipline: tarot runs `drawSpread(route.spread)` plus a signature card for its position, excluding the spread's cards; I Ching runs `castIChing()`. Draws are made just before that teller's reply.
- **ChatService.**
  - `sendMessage(conversationId, content, emit)` drops the `spreadType` and `webSearch` arguments.
  - `ChatServiceOptions.rank` becomes `route` (required; `server.ts` wires the local router), and the options gain `readLink?`. The pre-ranking `recall()` call is removed. Per-teller recall is unchanged.
  - Before the user message is appended, links are read (see Link reader). Read links are stored as `links` on the user message and emitted as `links_read`.
  - Per teller, in order: optionally search (only if `search` is configured and a query exists), then draw if reading. `message_start` carries the reading and signature card. The reply is stored with `reading`, `signatureCard` and `search: { query, results }`.
  - Events: `teller_reading`, `teller_lookup` (query plus results, or an error).
  - Teller input for its own reading: `Application-owned reading you were asked for (interpret it without changing it): ...`, plus the signature card for tarot, and the existing spread-specific length guidance.
  - Readings by tellers who replied earlier in this turn or conversation are labelled `Reading by <name> (reference; you may react to it, but it isn't yours to interpret as your own)`.
  - The no-reading context becomes: the latest reading by each teller and this teller's latest signature card, as reference. Tellers may offer a reading in their own discipline but never claim to have drawn one.
- **Link reader** `search/links.ts`:
  - `extractLinks(text)`: up to two unique `http(s)` URLs, trailing punctuation dropped.
  - `createLinkReader({ fetchImpl?, lookup? })`:
    - Rejects credentials in the URL.
    - Resolves the host with `dns.lookup(host, { all: true })` and refuses if any address is blocked: IPv4 0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16, 224/4+; IPv6 ::, ::1, fc00::/7, fe80::/10, ff00::/8, and IPv4-mapped forms of those.
    - Uses `redirect: "manual"`, re-checking every hop, at most three hops. Accepts only `text/html` or `text/plain`, at most 1 MB, with an 8-second abort.
    - HTML: removes script, style and noscript, takes the title, strips tags and entities, and collapses whitespace. Caps text at 6,000 characters.
    - Errors give a short reason and never the body.
  - Known gap: `fetch` re-resolves the host, so a DNS-rebinding race remains; pinning to the checked IP with an `undici` dispatcher `lookup` closes it if it stays small.
- **Tellers.**
  - The schema gains a required `readingLens` (how the teller reads in its discipline). `signatureCard { position }` is required only for `tarot` tellers and rejected for others. The `shadow` position is removed.
  - Mira moves her lens to `readingLens` and keeps the `action` card.
  - Sage gets `discipline: i-ching`, an I Ching voice, system prompt and lens (draft for owner review), and no signature card. Sage's activation profile is unchanged.
- **Store.** New nullable JSONB `links`. `reading`, `signature_card` and `search` are now written on teller messages. Old rows with a reading or results on the user message are left as they are and rendered as before.
- **API.** `spread` or `search` in the body gives a 400 (`readings and lookups are chosen by the tellers`).
- **Frontend.**
  - The composer keeps only the textarea, the hint and the send button. `SPREAD_OPTIONS`, `DEFAULT_SPREAD` and `DEFAULT_WEB_SEARCH` are removed.
  - A teller reply renders its reading (spread or hexagram), signature card and "Looked up: *query*" sources above or below the text. User messages render read links and "Couldn't open" entries. Old user-message readings and sources still render.
  - The thinking indicator no longer depends on `turnDrew`.
- **Tracing.** Per teller: `oracle.teller.reading` (discipline or none), `oracle.teller.searched`, `oracle.teller.search_results`. Per turn: `oracle.turn.links_read`, `oracle.turn.links_failed`. Remove `oracle.turn.spread` and `oracle.turn.search`.
- **Docs.** Update the PRD (readings are asked for; Mira tarot, Sage I Ching; search and links), `docs/operations.md`, `.env.example`, and the chat spec deferred line.

Rejected:
- **Keyword rules for reading requests.** They miss "go ahead" and match "I read a book".
- **A separate planning call per teller.** It's simpler to validate, but it adds one model call per teller per turn on a single GPU. Routing already reads the message and every profile.
- **Keeping memories in routing.** A search query could then carry a saved memory to Brave. Ranking only orders replies, so the loss is small.
- **Keeping one shared draw per message.** A reading now belongs to whoever gave it.
- **Letting the model call tools.** Unreliable on the local model, and it breaks ADR-0002 and ADR-0003.

## Verification

Test-first:
- Router: one call per turn (including one-to-one); parses scores, reading, spread and query per teller; drops `spread` for I Ching tellers; defaults to `three-card`; caps the query; invalid `reading` becomes `none`; the input contains no memories.
- ChatService:
  - named and unnamed reading rules in one-to-one and group chats;
  - the discipline decides the draw type; the requested spread is used; Mira's signature card is excluded from her spread; Sage gets no signature card;
  - the reading is persisted on the teller's reply; the other teller gets it as reference;
  - router failure: least-recently-spoken order, no reading, no lookup;
  - no memory recall before routing;
  - no search without a key; the query goes only to that teller; search failure is reported;
  - links are read once and shared; link failures are reported.
- Link reader: extraction; blocked addresses (IPv4, IPv6, mapped, after redirect); credentials; redirect cap; content type; size; timeout; HTML to text.
- Tellers: schema rejects a signature card on a non-tarot teller and a missing `readingLens`; Sage loads as I Ching.
- API: `spread` or `search` gives 400.
- Frontend: composer has no controls; teller readings, sources and links render; old messages still render.

Then the live checks listed in tasks.

## ADR alignment

- ADR-0011 is superseded by ADR-0012 for who triggers search. Its disclosure, untrusted-results and tracing rules carry over.
- ADR-0002 and ADR-0003: the router is one local structured call; the app makes every draw and external request.
- ADR-0004: spans carry outcomes and counts only.
- ADR-0007: ranking no longer uses consented context, so the router can't leak a memory into a search query. ADR-0012 records this.
- ADR-0008: both tellers still reply in ranked order; ranking also decides who answers an unnamed reading request.
- ADR-0009: per-teller recall is unchanged; memories never reach the router or the provider.
- ADR-0001 and ADR-0007: single-user, self-hosted scope is unchanged.
- ADR-0012 (Proposed, added here) records the new decision.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008, ADR-0009, ADR-0011, ADR-0012

## Implementation notes

- **Schema-constrained routing.** The first live run showed the local model writing invalid JSON in about a third of routing calls (it copied the activation profile's shape into `matchedCategories`), which silently dropped reading requests through the failure fallback. The router now asks for JSON matching a schema (`response_format: json_schema`, with teller IDs, readings and spreads as enums) at temperature 0. `AgentRequest` gained `outputSchema` and `temperature`. The model returns `{ "routes": [...] }`, and `spread: "none"` and `query: ""` mean no value.
- **Prompt evaluation.** The router prompt was tuned against 12 fixed cases (named, both, unnamed, Celtic Cross, "yes, go ahead", feelings, thanks, a pasted link, a dream about cards, a follow-up about an earlier card, a current-events question). Two runs scored 24/24 with no parse failures, at about 0.8 s per call on the RTX 5080.
- **`shadow` position kept.** `SIGNATURE_POSITIONS` still includes `shadow` so older messages with Sage's shadow card load and render. No teller definition uses it.
- **Composer component.** The composer moved into `Composer` in `message-body.tsx` so the "no controls" rule is unit-tested.
- **DNS rebinding.** Address pinning with an `undici` dispatcher was not added; the known gap stands as described above.
