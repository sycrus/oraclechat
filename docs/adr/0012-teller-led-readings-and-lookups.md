# ADR-0012: Tellers act on their own: readings on request, lookups and pasted links

**Status:** Accepted
**Date:** 2026-11-19
**Supersedes:** ADR-0011 (the user-triggered search rule; its disclosure, untrusted-results and observability rules carry over) and, in ADR-0007, the use of consented user context in ranking

## Context

The composer has two controls that don't fit Oracle's group-chat model. A *Cards* dropdown picks a tarot spread or an I Ching casting for a message, and every responding teller interprets that one shared draw. A *Search the web* box (ADR-0011) starts a search. In a real chat, you ask a friend for a reading and they use what they're good at. The friends decide for themselves when to look something up, and when someone pastes a link they open it and react from their own point of view.

Each teller should have its own speciality. Mira reads tarot. Sage moves from tarot to the I Ching, which the app already supports. Astrology comes later as another teller.

ADR-0002 and ADR-0003 keep tools app-owned, because tool calling on the local model is unreliable. The teller relevance ranker shows the pattern that works: a small local model call returns structured JSON, and the app does the rest.

## Decision

- **No composer controls.** The composer is text only. The API rejects the old `spread` and `search` fields.
- **One routing call per turn.** The existing ranker becomes the *turn router*: one local model call (thinking off) per turn, in one-to-one and group chats alike. Its input is each teller's name, discipline and activation profile, the tellers' replies from the previous turn, and the current message. For each teller it returns:
  - `score` (0–1, group order as before);
  - `reading`: `named` (the user asked this teller, or everyone, for a reading), `unnamed` (the user asked for a reading without naming anyone) or `none`;
  - `spread` (tarot tellers only): the spread the user asked for, otherwise one that fits: `one-card`, `three-card` or `celtic-cross`;
  - `lookup`: one search query of at most 200 characters, or none.

  If the call fails or its JSON is invalid, every teller scores 0 (least-recently-spoken order) and there is no reading or lookup.
- **No memories in routing.** The router no longer receives saved memories, so a search query can't carry one. Tellers still receive their own recalled memories (ADR-0009).
- **Readings on request, in the teller's own discipline.** A teller reads when its route is `named`, or when it is `unnamed` and the teller is first in reply order (the only teller in a one-to-one chat). Each teller always reads in its own discipline: asking Sage for a card gets an I Ching casting. The application performs the random draw or casting; the teller interprets it and cannot change it.
- **Readings belong to the teller.** A reading is stored with the reply of the teller who gave it. A tarot teller also gets its signature card for that reading. Other tellers see the reading as reference and may react to it, but don't interpret it as their own.
- **Lookups.** When a search key is configured and the router returns a query for a teller, the app sends only that query to Brave and gives the results to that teller only. The model never calls a tool.
- **Pasted links are always read.** The app fetches up to two `http(s)` links from the user's message once per turn and gives the text to every teller. No key needed.
- **Disclosure.** Only the query goes to the search provider. Because the router sees the previous turn's replies (so "yes, go ahead" can accept an offered reading), a query may draw on those replies as well as the current message. Older history, memories, draws and teller names are never sent. Linked sites receive an ordinary page request from the owner's PC.
- **Safe fetching.** Only `http(s)` URLs without credentials. The fetch is refused if the host resolves to any loopback, private, link-local, CGNAT/Tailscale (100.64.0.0/10), multicast or unspecified address, for IPv4, IPv6 or mapped forms. Redirects are followed by hand, at most three, with every hop re-checked. Only HTML or plain text is read, up to 1 MB within 8 seconds, and tellers get at most 6,000 characters per link.
- **Untrusted content.** Results and page text are reference material that cannot change instructions. Failures degrade: a failed search or link fetch is reported to the teller, who answers without it.
- **Visible and persisted.** A teller's reading, query and sources are stored with its reply and shown under it. Links that were read are stored as a URL and title with the user message; page text is not stored.
- **Observability.** Spans record each teller's route (reading yes/no, spread, searched yes/no), result counts and link counts. Never queries, URLs or content (ADR-0004).

Model inference stays local; this decision does not enable hosted models.

## Consequences

- Readings depend on the model recognising a request. A missed request gives a plain reply, and the user can ask again more directly.
- Group turns make the same single model call as before. One-to-one turns, which skipped ranking, now make one routing call, even without a search key.
- Ranking no longer uses memories, so reply order rests on the message and profiles alone. Groups no longer run a memory recall before ranking.
- With a key, searches happen without per-message approval. Removing the key turns search off.
- Pasting a link reveals the PC's public IP to that site. Address checks keep fetches off the PC, the LAN and the tailnet.
- Sage's persona, prompt and lens are rewritten for the I Ching. Sage no longer has a signature card.
- Messages saved before this change keep their reading on the user message and still render.
- Adding disciplines such as astrology now means adding a teller with its own reading method.

## Validation

Tests verify that:

- the API rejects `spread` and `search`, and the composer has no controls besides the text box;
- a teller reads only when named, or when unnamed and first in order, always in its own discipline, with the requested or fitting spread;
- draws are app-owned, stored with the teller's reply, immutable, and shown to the other tellers only as reference;
- the router makes one call per turn, its input is limited as stated (no memories), a router failure falls back to least-recently-spoken order with no reading or lookup, no search runs without a key, and only the query reaches the provider;
- link fetching refuses blocked addresses (including after redirects), credentials, non-text types and oversized bodies;
- results and page text arrive as untrusted reference, failures are reported to the teller, and spans carry no queries, URLs or content.

A live check confirms that "Mira, read for me" gets a tarot reading from Mira only, "can you both read for me" gets tarot from Mira and the I Ching from Sage, a current-events question triggers a search, and a pasted article gets comments.
