## ADDED Requirements

### Requirement: Workplace reflection teller
The roster SHALL include Milo as a workplace-reflection teller. He SHALL offer short app-defined reflection patterns suited to work style, team climate, meetings, workplace tradeoffs, strengths and role fit. Any MBTI-like discussion SHALL be described as informal reflection, not an official or validated type. He SHALL NOT issue categorical company-fit, hiring or employee-worth judgments.

#### Scenario: Milo is available in chat
- **WHEN** the teller registry loads
- **THEN** Milo is listed with the workplace-reflection discipline
- **AND** the user can start a one-to-one or two-teller conversation with him

#### Scenario: Informal work-style reflection
- **WHEN** the user explores work-style preferences with Milo
- **THEN** Milo may discuss broad preferences as tentative conversation starters
- **AND** does not claim to determine an official MBTI type

#### Scenario: Company culture is discussed
- **WHEN** the user asks whether they fit a company
- **THEN** Milo explores mutual preferences and tradeoffs
- **AND** does not issue a categorical fit verdict or employment recommendation

#### Scenario: Milo is not routed a divination reading
- **GIVEN** the user asks Milo to "read" a workplace situation
- **WHEN** the turn is routed
- **THEN** Milo receives no tarot, I Ching or astrology reading request
- **AND** the router may select a workplace reflection tool if one fits

### Requirement: Context-selected workplace tools
For Milo, the turn router MAY select at most one app-defined workplace tool from `three-lenses`, `team-weather`, `meeting-oracle`, `culture-signals`, `fork-in-the-road`, `strength-in-disguise`, and `role-compass`. It SHALL select a tool only when relevant to the current message or immediate conversation context. It SHALL return only the tool name; app code owns each tool's prompt and behavior. Other tellers SHALL NOT receive a workplace tool.

#### Scenario: Relevant tool is selected
- **GIVEN** the user describes tension around a meeting
- **WHEN** the turn is routed for Milo
- **THEN** the router may select `meeting-oracle`
- **AND** the app supplies its fixed reflection guidance

#### Scenario: No relevant tool
- **GIVEN** the user sends a greeting or unrelated question
- **WHEN** the turn is routed for Milo
- **THEN** no workplace tool is selected

#### Scenario: Invalid tool output
- **GIVEN** the router returns an unknown tool name or assigns a workplace tool to another teller
- **WHEN** the route is validated
- **THEN** the tool is discarded and the turn continues as ordinary conversation

### Requirement: Brief and optional reflection offers
When a workplace tool is selected, Milo SHALL offer a brief, optional prompt in ordinary chat. He SHALL ask no more than one focused question at a time and SHALL allow the user to decline or continue the conversation without completing a questionnaire. Tool prompts SHALL NOT be persisted as a separate assessment or profile.

#### Scenario: User accepts an offer
- **WHEN** Milo offers a short reflection and the user engages
- **THEN** the conversation continues through ordinary chat messages
- **AND** the tool does not require a fixed multi-question sequence

#### Scenario: User declines
- **WHEN** the user declines or changes the subject
- **THEN** Milo follows the user's direction without repeating the offer

#### Scenario: Decline is reflected in routing
- **GIVEN** Milo offered a workplace tool in the previous turn
- **WHEN** the user declines it or changes the subject
- **THEN** the router selects no workplace tool for that turn
