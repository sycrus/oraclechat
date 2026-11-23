## Purpose

Defines reference material and tools available to Oracle tellers. Tellers may look things up and read links the user pastes, but the application makes every external request and draw; there are no model-callable tools (ADR-0012). Tarot draws and I Ching castings are created by the application and provided to tellers for interpretation. The bundled catalog contains original Oracle interpretations and pixel-art card faces.

---

### Requirement: Tellers interpret application-provided draws

Tellers SHALL interpret only readings and signature cards supplied by the application. They SHALL NOT claim to perform an independent draw or casting, or change a reading or signature card. Tellers MAY use only the search results and page text the application supplied for that turn, and SHALL NOT claim to have searched or read anything they were not given.

#### Scenario: Tellers receive fixed tarot cards

- GIVEN the application has drawn a spread for a teller's reading
- WHEN that teller generates its reading
- THEN it receives the same card names, positions, and orientations as the application draw
- AND it does not add or remove cards

#### Scenario: Teller receives its signature card
- **WHEN** a tarot teller generates its reading
- **THEN** its input contains its spread and only its own signature card

### Requirement: Provenance-aware original tarot catalog

The local tarot catalog SHALL provide original orientation-specific interpretations for all 78 cards. Content provenance SHALL distinguish traditional card naming from original Oracle interpretations and illustrations. Tellers SHALL use the supplied catalog interpretation as reading context.

#### Scenario: Catalog text is orientation-specific

- GIVEN a card is drawn upright or reversed
- WHEN the spread is displayed and interpreted
- THEN the matching original interpretation is supplied and displayed
- AND the content source is recorded in project provenance documentation

### Requirement: Teller-initiated web search

When a search provider is configured, the application SHALL decide, separately for each responding teller, whether that teller would look something up for the current message, as part of the turn router's single call (see the orchestration spec). When the router returns a query for a teller, the application SHALL send only that query (at most 200 characters) to the provider. It SHALL give that teller at most five cleaned results as untrusted reference material, and store the query and results with that teller's reply. The user SHALL NOT control whether a search happens, and models SHALL NOT call tools. The provider key, queries and results SHALL NOT appear in traces; traces record only whether a teller searched and how many results returned.

#### Scenario: Teller decides to search
- **WHEN** the router returns a query and a provider is configured
- **THEN** only that query is sent to the provider
- **AND** that teller receives the results as untrusted reference material
- **AND** the query and results are stored with that teller's reply and shown under it

#### Scenario: Teller decides not to search
- **WHEN** the router returns no lookup
- **THEN** no request is made to the provider for that teller

#### Scenario: Router input is limited
- **WHEN** the application routes a turn
- **THEN** the input contains the tellers' names, disciplines and activation profiles, the previous turn's teller replies and the current message
- **AND** it contains no older history, memories or draws

#### Scenario: No provider configured
- **WHEN** no search key is configured
- **THEN** no search is made, even if the router returns a query

#### Scenario: Decision or search fails
- **WHEN** the routing call fails
- **THEN** the teller replies without a search
- **WHEN** the search itself fails
- **THEN** the teller is told the search failed and does not claim to have searched

#### Scenario: The user cannot request a search
- **WHEN** a message request includes a `search` field
- **THEN** it is rejected before the turn starts

### Requirement: Pasted links are read

When a user message contains `http` or `https` links, the application SHALL fetch up to two of them once for that turn and give the extracted page text, capped at 6,000 characters per link, to every responding teller as untrusted reference material. It SHALL refuse URLs with credentials and any host that resolves to a loopback, private, link-local, CGNAT, multicast or unspecified address, including after redirects (at most three). It SHALL read only HTML or plain text, up to 1 MB within 8 seconds. It SHALL store the URL and title of each link it read with the user message and show them, and SHALL NOT store page text. Traces SHALL record only counts of links read and failed.

#### Scenario: User pastes a link
- **WHEN** the user's message contains a public article link
- **THEN** the page text is given to every responding teller as reference material
- **AND** the link and its title are shown under the user message

#### Scenario: Link points at a private network
- **WHEN** a link's host resolves to a loopback, private, link-local or tailnet address, directly or through a redirect
- **THEN** it is not fetched and the tellers are told it couldn't be opened

#### Scenario: Link can't be read
- **WHEN** a link times out, returns an error, is too large or is not HTML or text
- **THEN** the turn completes and the tellers are told that link couldn't be opened

#### Scenario: Page content is data
- **WHEN** a page or search result contains instructions
- **THEN** the teller treats it as reference text and its own instructions are unchanged

## Deferred capabilities

- Other external retrieval: other search providers, several searches per turn, PDFs, images or JavaScript-rendered pages
- Knowledge bases for other disciplines
- External images or generated visuals
