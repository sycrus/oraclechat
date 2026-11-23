## MODIFIED Requirements

### Requirement: Tellers interpret application-provided draws

Tarot tellers SHALL interpret the shared spread and their own signature card as supplied by the application. They SHALL NOT claim to perform an independent draw, change the spread or their signature card, or claim to search for current information. When the user asked for a web search, tellers MAY use only the results the application supplied, and SHALL NOT claim results they were not given.

#### Scenario: Tellers receive fixed tarot cards

- GIVEN the application has drawn a spread for a user message
- WHEN a teller generates its reading
- THEN it receives the same card names, positions, and orientations as the application draw
- AND it does not add or remove cards

#### Scenario: Teller receives its signature card
- **WHEN** a teller generates its reading
- **THEN** its input contains the shared spread and only its own signature card

## ADDED Requirements

### Requirement: User-triggered web search

The application SHALL search the web only when the user asks for it on a specific message and a search provider is configured. It SHALL send only that message's text to the provider, never conversation history, memories or card draws. It SHALL give each responding teller at most five results (title, URL, short cleaned description) as untrusted reference material. It SHALL store the results with that user message and show them as sources. Models SHALL NOT trigger searches. The provider key SHALL NOT appear in events, traces or the frontend, and traces SHALL record only whether a turn searched and how many results returned.

#### Scenario: No search unless asked
- **WHEN** a user sends a message without asking for a web search
- **THEN** no request is made to the search provider

#### Scenario: User asks for a search
- **WHEN** the user sends a message with web search requested and a provider is configured
- **THEN** only that message's text is sent to the provider
- **AND** up to five cleaned results are persisted with the message and shown as sources
- **AND** every responding teller receives the same results as untrusted reference material

#### Scenario: Search is not configured
- **WHEN** a message requests web search and no provider key is configured
- **THEN** the request is rejected before the turn starts

#### Scenario: Search fails
- **WHEN** the provider errors or times out
- **THEN** the turn still completes without results
- **AND** the tellers are told the search was unavailable and do not claim to have searched

#### Scenario: Search results are data
- **WHEN** a result contains instructions
- **THEN** the teller treats it as reference text and its own instructions are unchanged
