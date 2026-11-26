## Purpose

Defines Oracle's self-hosted, single-user desktop-first chat. The MVP has a recent conversation list and one main chat pane, one-to-one or two-teller chats with Mira and Sage, attributed streaming messages, and inline app-owned readings (Mira's tarot spreads, Sage's I Ching castings) that the user asks a teller for.

---

## Requirements

### Requirement: Local conversation history

The application SHALL persist conversations and ordered attributed messages in local PostgreSQL. The conversation list SHALL be ordered by latest activity. Users SHALL be able to delete conversations; deleting one SHALL also remove its messages and source-linked memories.

#### Scenario: Conversation history survives restart

- GIVEN a user has sent and received messages
- WHEN Oracle is restarted and the same conversation is reopened
- THEN the conversation and ordered messages remain available

#### Scenario: Conversations sort by recent activity

- GIVEN several conversations have different latest activity times
- WHEN the list is loaded
- THEN the most recently active conversation appears first

#### Scenario: Delete conversation and source-linked memories

- GIVEN a conversation and memories extracted from it
- WHEN the user deletes that conversation
- THEN its messages and source-linked memories are deleted
- AND other conversations and their memories remain

### Requirement: MVP teller conversations

The application SHALL allow a user to start a one-to-one chat with Mira, Sage, Astra or Milo, or a group chat with any two of them. Every chat message SHALL identify its sender. A one-to-one chat SHALL route each user message directly to its sole teller. In a group chat both tellers SHALL respond, in the order set by application-owned relevance ranking.

#### Scenario: Start a one-to-one chat
- **WHEN** the user selects Mira alone and sends a message
- **THEN** only Mira is a member and she responds to each user message

#### Scenario: Start a two-teller chat
- **WHEN** the user selects Mira and Sage and sends a message
- **THEN** both tellers respond
- **AND** each response is attributed to its teller

#### Scenario: Start a chat with Astra
- **WHEN** the user selects Astra alone, or Astra with Mira or Sage
- **THEN** the conversation is created and Astra responds

#### Scenario: Start a chat with Milo
- **WHEN** the user selects Milo alone, or Milo with one other teller
- **THEN** the conversation is created and Milo responds

#### Scenario: Three tellers
- **WHEN** a conversation request names any three tellers
- **THEN** it is rejected

### Requirement: Streamed message exchange

The application SHALL stream teller text as server-sent events and persist completed teller messages. When two tellers respond, the second teller SHALL receive the first teller's completed reply as conversation context.

#### Scenario: Stream and persist a response

- GIVEN the user sends a message
- WHEN the selected teller generates a response
- THEN response chunks appear in order
- AND the completed text is persisted with teller attribution

#### Scenario: Second teller sees the first reply

- GIVEN both tellers are selected to respond
- WHEN the second teller receives its input
- THEN the first teller's completed response is included in its conversation history

### Requirement: Desktop-first conversation layout

The interface SHALL be laid out like a messaging app. On a screen at least 900px wide it SHALL show the chat list beside the open chat, with a narrow rail switching between the Chats and You tabs. On a narrower screen it SHALL show one pane at a time, with a bottom bar for the Chats and You tabs: opening a chat replaces the list, and the chat's back button returns to it. With no chat open on a wide screen, the chat pane SHALL show an empty state inviting the user to pick or start a chat.

#### Scenario: Two panes on desktop
- **GIVEN** the window is 1280px wide
- **WHEN** the user opens a conversation
- **THEN** the chat list stays visible on the left and the conversation opens on the right

#### Scenario: One pane on a phone
- **GIVEN** the window is 390px wide
- **WHEN** the user opens a conversation from the list
- **THEN** the conversation fills the screen
- **AND** its back button returns to the list

#### Scenario: Choose a teller roster for a new reading
- **GIVEN** the user starts a new chat
- **WHEN** the new-chat screen appears
- **THEN** the user can start a chat with any one teller, or create a group with two

### Requirement: Signature card in the reply
When a tarot teller gives an immediate reading, `message_start` SHALL include its signature card, and the reply SHALL display it labeled by position (Action card) with the reply's first bubble. For a reading dealt from a card fan, the signature card SHALL instead be sent and shown with the revealed reading, before the interpretation streams.

#### Scenario: Card appears with the first bubble
- **WHEN** Mira gives an immediate reading
- **THEN** her action card is shown when her reply's first bubble appears

#### Scenario: Card appears with the reveal
- **WHEN** the user reveals Mira's fan
- **THEN** her action card is shown with the dealt spread
- **AND** it is shown before her interpretation streams

### Requirement: Failed turns report their reason

When a turn fails after streaming has started, the stream SHALL end with an `error` event whose `error` field carries the failure reason, and the UI SHALL show that reason.

#### Scenario: Ranker failure is reported
- **WHEN** the ranker selects no teller for a group turn
- **THEN** the stream ends with `{"type":"error","error":"Ranker did not select a conversation teller"}`

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

### Requirement: Bounded teller history

The conversation history sent to a teller SHALL be limited to the newest messages that fit `HISTORY_TOKEN_BUDGET` (default 8,000 estimated tokens). The newest user message SHALL always be included. When earlier messages are omitted, the history SHALL begin with an omission marker. Teller instructions, consented memories and the tarot draw SHALL NOT count against or be cut by this budget. The history SHALL be rebuilt from the stored messages for every reply. Omitted messages SHALL be dropped, not summarised.

#### Scenario: Long conversation stays in budget
- **WHEN** a conversation has 25 turns and the user sends another message
- **THEN** the teller's history fits the budget, includes the newest message, and starts with the omission marker
- **AND** the teller's persona instructions are unchanged

#### Scenario: Dropped history is not summarised
- **GIVEN** a conversation longer than the budget
- **WHEN** a teller replies
- **THEN** the omitted messages are absent from the teller's input, with only the omission marker in their place
- **AND** no summary of them is made or stored

### Requirement: Messages are saved when complete

The user's message SHALL be saved before routing. A teller reply SHALL be saved only once its stream completes. A reply interrupted by a model error or a restart SHALL NOT be saved, and the conversation SHALL continue from the last saved message. There SHALL be no mid-reply checkpoint or resume.

#### Scenario: Interrupted reply
- **GIVEN** a teller has streamed part of a reply
- **WHEN** the model call fails
- **THEN** the turn ends with an error, the user's message stays saved, and no partial teller reply is saved

#### Scenario: Restart mid-reply
- **WHEN** the backend restarts while a reply is streaming
- **THEN** on reopening the conversation, it shows the messages saved before that reply, and the next message continues from them

### Requirement: Conversation turns without cards

When a teller gives no reading, it SHALL reply in character without interpreting or inventing a reading, and MAY offer one in its own discipline. It SHALL receive each teller's most recent reading in the conversation and its own most recent signature card, if any, as reference, so it can expand on earlier readings.

#### Scenario: Going deeper into an earlier reading
- **WHEN** Mira gave a three-card reading earlier and the user now asks "tell me more about the present card"
- **THEN** no new reading is drawn unless the router says one was asked for
- **AND** Mira receives her earlier spread as reference and is told not to invent new cards

### Requirement: Clear chat history

The user SHALL be able to delete all conversations in one confirmed action. Clearing chat history SHALL keep saved memories, which then have no source conversation.

#### Scenario: Clear all chats, keep memories
- **WHEN** the user confirms Clear chat history
- **THEN** every conversation and message is deleted
- **AND** saved memories remain and are still shown in the You tab

### Requirement: Readings are asked for, not chosen in the composer

The composer SHALL contain only the message box and send button. Message requests containing `spread` or `search` SHALL be rejected before the turn starts. Before each responding teller replies, the application SHALL make use the turn router's single call to classify the message as asking this teller (by name, or everyone) for a reading (`named`), asking for a reading without naming anyone (`unnamed`), or neither (`none`). For a tarot teller it SHALL pick the spread the user asked for, otherwise one that fits. A teller SHALL give a reading when its route is `named`, or `unnamed` and it is first in reply order. Every reading SHALL use that teller's own discipline. A failed routing call SHALL mean no reading for any teller.

#### Scenario: Asking one teller by name in a group
- **WHEN** the user writes "Mira, can you read for me?" in a group chat
- **THEN** Mira gives a tarot reading
- **AND** Sage replies without a reading

#### Scenario: Asking everyone
- **WHEN** the user writes "can you both do a reading for me?"
- **THEN** Mira gives a tarot reading and Sage gives an I Ching casting

#### Scenario: Asking without naming anyone
- **WHEN** the user asks for a reading in a group chat without naming a teller
- **THEN** only the first teller in reply order gives a reading

#### Scenario: Teller uses its own skill
- **WHEN** the user asks Sage to "pull a card"
- **THEN** Sage gives an I Ching casting

#### Scenario: Astra uses her own skill
- **GIVEN** birth details are saved
- **WHEN** the user asks Astra to "pull a card" or "look at my chart"
- **THEN** Astra gives an astrology reading

#### Scenario: Asking Astra and Mira together
- **GIVEN** a group chat with Astra and Mira and saved birth details
- **WHEN** the user writes "can you both read for me?"
- **THEN** Astra gives an astrology reading and Mira gives a tarot reading

#### Scenario: Requested spread is honoured
- **WHEN** the user asks Mira for a Celtic Cross
- **THEN** Mira's reading is a Celtic Cross

#### Scenario: Accepting an offered reading
- **WHEN** a teller offered a reading in the previous turn and the user replies "yes, go ahead"
- **THEN** that teller gives a reading

#### Scenario: No request, no reading
- **WHEN** the user's message doesn't ask for a reading
- **THEN** no teller draws or casts

#### Scenario: Old composer fields are rejected
- **WHEN** a message request includes `spread` or `search`
- **THEN** it is rejected with a 400 before the turn starts

### Requirement: Readings belong to the teller who gave them

A reading SHALL be drawn by the application just before the teller who gives it replies, sent in that teller's `message_start`, persisted with that teller's reply, and shown above it. Tellers replying after it, in this turn or later turns, SHALL receive it labelled with its teller's name as reference they may react to but SHALL NOT interpret as their own. Messages saved before this change with a reading on the user message SHALL still render.

#### Scenario: Second teller reacts to the first's reading
- **WHEN** Mira gives a tarot reading and Sage replies after her
- **THEN** Sage's input contains Mira's reading labelled as Mira's reference
- **AND** Sage does not get a reading unless its route says so

#### Scenario: Reading persists with the reply
- **WHEN** a conversation with a teller's reading is reopened
- **THEN** the reading is shown with that teller's reply

### Requirement: Fan readings are dealt at the reveal
A reading dealt from a card fan SHALL be saved with the fan message at the reveal. No teller SHALL receive any card of the fan before then; after the reveal, a teller other than the fan's SHALL receive the dealt reading as reference labelled with its teller's name, as for any reading.

#### Scenario: Fan reading is Mira's reference after the reveal
- **GIVEN** Mira's fan has been revealed
- **WHEN** Sage replies in a later turn
- **THEN** Sage's input contains the dealt reading labelled as Mira's reference

#### Scenario: Unrevealed fan is not shared
- **GIVEN** Mira's fan is open
- **WHEN** Sage replies
- **THEN** Sage's input contains no card from the fan

#### Scenario: Dealt reading persists with the fan message
- **WHEN** a conversation with a revealed fan is reopened
- **THEN** the dealt reading is shown on the fan message, and the interpretation is a separate reply after it

### Requirement: Conversation summaries carry the last message
The conversation list API SHALL return, for each conversation, its last message's sender type, sender id, a plain-text preview of at most 80 characters with Markdown markup and line breaks removed, and its time. A conversation with no messages SHALL return no last message.

#### Scenario: Last message in the summary
- **GIVEN** a conversation whose last message is Mira's reply "**The Star**, upright.\n\nHope returns."
- **WHEN** the conversation list is loaded
- **THEN** its summary's last message names Mira and previews "The Star, upright. Hope returns."

#### Scenario: Empty conversation
- **WHEN** a conversation has no messages yet
- **THEN** its summary has no last message

### Requirement: Chat list rows
The chat list SHALL show one row per conversation, most recent first; there is one conversation per correspondent, so each teller, and each pair of tellers, appears at most once. Each row SHALL show the teller avatar (two overlapping avatars for a group), the chat's name as its largest text — the teller's name, or both names joined by "&" for a group, as WhatsApp names a contact — and below it, smaller, the last message prefixed by its sender ("You: " for the user and the teller's name in a group chat), and the last message's time: the clock time for today, "Yesterday", the weekday within the past week, or the date otherwise. A search box SHALL filter rows by teller name, chat topic (its first message) or last message, ignoring case. Each row SHALL open its conversation.

#### Scenario: A group row
- **GIVEN** a group chat with Mira and Sage whose last message is from Sage
- **WHEN** the list is shown
- **THEN** its row shows both avatars and a preview starting "Sage: "

#### Scenario: Time labels
- **GIVEN** conversations last active today at 21:14, yesterday, three days ago and a month ago
- **WHEN** the list is shown
- **THEN** their times read "21:14", "Yesterday", the weekday name, and the date

#### Scenario: Searching
- **WHEN** the user types "band" in the search box
- **THEN** only conversations whose teller name, topic or last message contains "band" are listed

### Requirement: Starting a chat
A new-chat button SHALL open a new-chat screen listing every chat teller with their avatar and detail line, and a "New group" entry. Choosing a teller SHALL open the one-to-one conversation with that teller, creating it only when none exists. "New group" SHALL let the user tick exactly two tellers and open the group conversation with them, creating it only when none exists for that pair in either order.

#### Scenario: One-to-one from the new-chat screen
- **GIVEN** there is no chat with Sage yet
- **WHEN** the user taps Sage on the new-chat screen
- **THEN** a conversation with Sage alone is created and opened

#### Scenario: Reopening an existing correspondent
- **GIVEN** a chat with Mira already exists
- **WHEN** the user taps Mira on the new-chat screen
- **THEN** that chat opens, no new conversation is created, and the list still has one Mira row

#### Scenario: New group
- **WHEN** the user chooses "New group", ticks Mira and Astra and confirms
- **THEN** the group conversation with Mira and Astra is opened, created if it did not exist
- **AND** choosing Astra and Mira later opens the same group

#### Scenario: Group needs two
- **GIVEN** the user has ticked only one teller in "New group"
- **THEN** the create button is disabled

### Requirement: Day headers in the thread
The thread SHALL show a centred date pill above the first message of each day: "Today", "Yesterday", the weekday within the past week, or the date ("18 Oct 2026") otherwise. While scrolling, the pill of the day at the top of the view SHALL stay pinned to the top of the thread until the next day's pill reaches it.

#### Scenario: Messages across days
- **GIVEN** a chat with messages from 18 Oct 2026, yesterday and today
- **WHEN** it opens
- **THEN** the pills "18 Oct 2026", "Yesterday" and "Today" each appear once, above that day's first message

#### Scenario: Scrolling back
- **WHEN** the user scrolls up into yesterday's messages
- **THEN** the "Yesterday" pill is pinned at the top of the thread

### Requirement: Chat header and menu
The open chat's header SHALL show a back button, the avatar, the chat's name and, below it, the teller's detail line or a group's members, and a video-call button when the chat has a single callable teller. Its menu SHALL offer "Delete chat", which deletes the conversation after confirmation.

#### Scenario: Group header
- **WHEN** a group chat with Mira and Sage is open
- **THEN** the header shows "Mira & Sage", lists "Mira, Sage, You" under it and has no video-call button

#### Scenario: Delete from the menu
- **WHEN** the user chooses "Delete chat" and confirms
- **THEN** the conversation and its messages are deleted and the list no longer shows it

### Requirement: Message ticks
Each of the user's messages SHALL show a single tick while no teller has replied after it, and a double tick in the accent colour once a teller message follows it. Each tick state SHALL have an accessible name ("Sent", "Answered").

#### Scenario: Waiting for a reply
- **WHEN** the user has just sent a message
- **THEN** it shows a single tick

#### Scenario: Answered
- **WHEN** a teller's reply follows the message
- **THEN** it shows a double accent tick

### Requirement: Settings in the You tab
The You tab SHALL hold the memory consent, hosted-sharing consent, saved memories, birth details and "Clear chat history" controls, with the same behavior they had in the memory and privacy panel.

#### Scenario: Turning memory on
- **WHEN** the user opens the You tab and turns on "Remember details"
- **THEN** memory consent is saved and the saved-details list appears

### Requirement: Suggested questions
A completed I Ching casting's line-by-line sheet and the full chart view SHALL offer up to three suggested questions derived from the reading, such as "What does line 6 mean?" or "What does Saturn in Aquarius mean?". Tapping one SHALL close the sheet and send its text as the user's message, exactly as if typed. Suggestions SHALL be disabled while a reply is in progress.

#### Scenario: Asking from a suggestion
- **GIVEN** Sage's line-by-line sheet is open for a casting with line 6 changing
- **WHEN** the user taps "What does line 6 mean?"
- **THEN** the sheet closes and that text is sent to the conversation as the user's message

#### Scenario: Busy
- **WHEN** a teller is still replying
- **THEN** the suggestions are disabled
