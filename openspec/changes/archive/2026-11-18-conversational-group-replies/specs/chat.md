## MODIFIED Requirements

### Requirement: MVP teller conversations

The application SHALL allow a user to start a one-to-one chat with either Mira or Sage, or a group chat with both. Every chat message SHALL identify its sender. A one-to-one chat SHALL route each user message directly to its sole teller. In a group chat both tellers SHALL respond, in the order set by application-owned relevance ranking.

#### Scenario: Start a two-teller chat
- **WHEN** the user selects Mira and Sage and sends a message
- **THEN** both tellers respond
- **AND** each response is attributed to its teller

## ADDED Requirements

### Requirement: Conversational reply presentation

Teller replies SHALL render Markdown formatting (emphasis, headings, lists) without rendering raw HTML. Each teller reply SHALL be displayed as one chat bubble per paragraph, where paragraphs are separated by blank lines; bubbles SHALL appear as the stream reaches each paragraph. Only the first bubble of a reply SHALL carry the teller byline. The stored message SHALL remain a single teller message.

#### Scenario: Markdown renders as formatting
- **WHEN** a teller reply contains `**Past: Seven of Cups**`
- **THEN** the text is shown in bold without asterisks

#### Scenario: Raw HTML is not rendered
- **WHEN** a teller reply contains `<script>` or other HTML
- **THEN** it is not inserted into the page as HTML

#### Scenario: Paragraphs become separate bubbles
- **WHEN** a teller reply contains three paragraphs separated by blank lines
- **THEN** three bubbles are shown for that teller, with the byline only on the first

### Requirement: Thinking indicator

While a sent message is awaiting a teller reply that has not started streaming, the chat SHALL show a thinking indicator. The indicator SHALL disappear when a reply starts streaming and reappear while the next expected teller has not yet started. It SHALL not show once every expected teller has completed.

#### Scenario: Indicator during ranking and between tellers
- **WHEN** a group message is sent and no reply has started
- **THEN** the thinking indicator is visible
- **AND** after the first teller completes, it is visible again until the second teller starts

#### Scenario: Indicator hides after all replies
- **WHEN** every expected teller has completed while the request is still open
- **THEN** the thinking indicator is not shown
