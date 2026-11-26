## MODIFIED Requirements

### Requirement: Signature card in the reply
When a tarot teller gives an immediate reading, `message_start` SHALL include its signature card, and the reply SHALL display it labeled by position (Action card) with the reply's first bubble. For a reading dealt from a card fan, the signature card SHALL instead be sent and shown with the revealed reading, before the interpretation streams.

#### Scenario: Card appears with the first bubble
- **WHEN** Mira gives an immediate reading
- **THEN** her action card is shown when her reply's first bubble appears

#### Scenario: Card appears with the reveal
- **WHEN** the user reveals Mira's fan
- **THEN** her action card is shown with the dealt spread
- **AND** it is shown before her interpretation streams

### Requirement: Conversational reply presentation

Teller replies SHALL render Markdown formatting (emphasis, headings, lists) without rendering raw HTML. Each teller reply SHALL be displayed as one chat bubble per paragraph, where paragraphs are separated by blank lines; in chat, bubbles SHALL appear one at a time as described in "Paced reply reveal". The first bubble of a run of consecutive messages from one sender SHALL carry a tail; later bubbles in the run SHALL not. In a group chat the first bubble of each teller's run SHALL show the teller's name; in a one-to-one chat no name SHALL be shown. The stored message SHALL remain a single teller message. A reply's reading SHALL appear below its bubbles: the tarot spread, then the signature card, the I Ching card or the chart summary, each after the teller's words.

#### Scenario: Markdown renders as formatting
- **WHEN** a teller reply contains `**Past: Seven of Cups**`
- **THEN** the text is shown in bold without asterisks

#### Scenario: Raw HTML is not rendered
- **WHEN** a teller reply contains `<script>` or other HTML
- **THEN** it is not inserted into the page as HTML

#### Scenario: Paragraphs become separate bubbles
- **WHEN** a teller reply contains three paragraphs separated by blank lines
- **THEN** three bubbles are shown for that teller, and only the first has a tail

#### Scenario: Names in a group chat
- **GIVEN** a chat with Mira and Sage
- **WHEN** Mira replies and then Sage replies
- **THEN** Mira's first bubble shows "Mira" and Sage's first bubble shows "Sage"

#### Scenario: No names one-to-one
- **GIVEN** a chat with Mira alone
- **WHEN** Mira replies
- **THEN** no sender name is shown on her bubbles

### Requirement: Thinking indicator

While a sent message is awaiting a teller reply that has not started streaming, the chat SHALL show a thinking indicator. The indicator SHALL disappear when a reply starts streaming and reappear while the next expected teller has not yet started. It SHALL not show once every expected teller has completed, nor while a reply's typing dots are shown.

#### Scenario: Indicator during ranking and between tellers
- **WHEN** a group message is sent and no reply has started
- **THEN** the thinking indicator is visible
- **AND** after the first teller completes, it is visible again until the second teller starts

#### Scenario: Indicator hides after all replies
- **WHEN** every expected teller has completed while the request is still open
- **THEN** the thinking indicator is not shown

## ADDED Requirements

### Requirement: Paced reply reveal

In chat, a teller reply received live SHALL appear like someone typing: typing dots, then its first paragraph bubble whole, then typing dots before each later bubble, until the reply is shown. Each pause SHALL scale with the length of the bubble it precedes, vary randomly, last between 1 and 6 seconds, and count from when the previous bubble appeared (for the first bubble, from when the user sent or acted). A bubble SHALL appear only once its paragraph is fully written. In a group chat a teller's reply SHALL stay hidden until the previous teller's last bubble has appeared. A reply's reading SHALL appear with its first bubble. Sending a message, opening a chat or a failed turn SHALL show any pending bubbles at once. Messages loaded from history and video calls SHALL NOT be paced, and the saved message SHALL be unchanged.

#### Scenario: Bubbles arrive one at a time
- **GIVEN** a reply with three paragraphs
- **WHEN** it arrives in chat
- **THEN** typing dots show, then the first bubble, then dots, then the second, then dots, then the third

#### Scenario: Longer bubbles take longer
- **WHEN** a short line and a long paragraph are revealed
- **THEN** the long paragraph's pause is longer, and neither pause is under 1 s or over 6 s

#### Scenario: Group replies take turns
- **GIVEN** a chat with Mira and Sage
- **WHEN** both reply
- **THEN** none of Sage's reply shows until Mira's last bubble has appeared

#### Scenario: Reading with the first bubble
- **WHEN** Sage replies with a casting
- **THEN** the I Ching card is not shown before Sage's first bubble, and is shown with it

#### Scenario: Sending shows the rest
- **GIVEN** a reply still being revealed
- **WHEN** the user sends a new message
- **THEN** the rest of the reply is shown at once

#### Scenario: History and calls are not paced
- **WHEN** a chat is opened from history, or a teller speaks in a call
- **THEN** messages are shown, or sentences spoken, without typing pauses
