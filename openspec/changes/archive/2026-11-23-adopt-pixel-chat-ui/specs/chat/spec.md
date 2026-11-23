# Spec Delta

## MODIFIED Requirements

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

### Requirement: Conversational reply presentation

Teller replies SHALL render Markdown formatting (emphasis, headings, lists) without rendering raw HTML. Each teller reply SHALL be displayed as one chat bubble per paragraph, where paragraphs are separated by blank lines; bubbles SHALL appear as the stream reaches each paragraph. The first bubble of a run of consecutive messages from one sender SHALL carry a tail; later bubbles in the run SHALL not. In a group chat the first bubble of each teller's run SHALL show the teller's name; in a one-to-one chat no name SHALL be shown. The stored message SHALL remain a single teller message. A reply's reading SHALL appear below its bubbles: the tarot spread, then the signature card, the I Ching card or the chart summary, each after the teller's words.

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

## ADDED Requirements

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
