## Intent

Let the user ask for a web search on a specific message, so the tellers can draw on current information while the models stay local.

## Why now

Web search is the next deferred item in milestone 5. The owner has a Brave Search API key and wants searches to be user-triggered, which fits the app-owned tool model in ADR-0002 and ADR-0003.

## What changes

- **Composer checkbox** *Search the web*, off by default and reset after each send, with a note that the message is sent to Brave. The API accepts `search: true`.
- **Search step.** When requested and configured, the backend sends only that message's text to the Brave Search API and keeps the top five results (title, URL, cleaned description).
- **Tellers** receive the results as untrusted reference material and are told if search failed. They do not search themselves.
- **Persistence and display.** The results are stored with the user message and shown as a "Sources" list of links under it.
- **Configuration.** `BRAVE_SEARCH_API_KEY` in `.env`; requests with `search: true` are rejected with a 400 when it is unset.
- **ADR-0011** records the decision (Proposed until the owner accepts it).

## Non-goals

- Model-initiated or automatic searches, or a model-callable search tool.
- Sending history, memories or card draws to the provider.
- Link previews, page fetching or other providers.
- Carrying earlier search results into later turns.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008, ADR-0011
