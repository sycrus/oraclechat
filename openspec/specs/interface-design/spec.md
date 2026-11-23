## Purpose

Defines OracleChat's visual system (ADR-0019): a 4-bit pixel look on a dark navy palette, applied the same way on every screen.

## Requirements

### Requirement: Limited palette
The interface SHALL draw every colour from one token set (pixel art — teller profile pictures and 24×36 pixel tarot cards, shown alike in the chat and on calls — may also use the call palette's skin, hair and clothing tones): night `#0b1028`, panel `#121a3d`, raised `#1c2752`, line `#2a3768`, mine `#2d4a8c`, dim `#5b6488`, muted `#8c93b0`, gray `#d4d8e4`, white `#f0f2f8`, accent `#e8c35a` and danger `#d9534f`. The interface SHALL use no gradients, blurs, translucent overlays or soft shadows. A dimmed backdrop SHALL be drawn as a pixel dither pattern. The accent SHALL be reserved for the main action, active state, read ticks and changing or selected reading elements.

#### Scenario: No colour outside the palette
- **WHEN** the stylesheet is checked
- **THEN** every colour value it declares is one of the palette tokens

#### Scenario: Backdrop behind a sheet
- **WHEN** a bottom sheet or full-screen form opens over the chat
- **THEN** the chat behind it is covered by a checkerboard dither, not a translucent colour

### Requirement: Pixel type
Body text SHALL use Handjet, and the OracleChat wordmark and screen titles SHALL use Pixelify Sans Bold. Both fonts SHALL be served from the application's own files under their OFL licences, with no request to an external font service. Body text SHALL be at least 16px and message text at least 19px.

#### Scenario: Fonts load offline
- **GIVEN** the machine has no internet connection
- **WHEN** the app loads
- **THEN** the text renders in Handjet and Pixelify Sans

### Requirement: Stepped shapes and pixel icons
Corners SHALL step in 4px increments instead of curving. Avatars and round buttons SHALL step twice so they read as pixel circles. Icons SHALL be drawn on a 16×16 grid with square edges, shown at whole multiples of that grid where the screen density allows, and SHALL NOT be emoji. Every icon-only button SHALL have an accessible name.

#### Scenario: Icon buttons are named
- **WHEN** assistive technology reaches any icon-only button
- **THEN** it announces a name such as "Video call" or "Back to chats"

### Requirement: Readable contrast
Text SHALL meet a 4.5:1 contrast ratio against its background, and icons and large text 3:1, in every state. Interactive targets SHALL be at least 44px in their smaller dimension, except inline chips at 36px.

#### Scenario: Muted text contrast
- **WHEN** muted text is shown on the raised colour
- **THEN** its contrast ratio is at least 4.5:1

### Requirement: Teller profile pictures
Each chat teller SHALL have a pixel-art profile picture that reflects their personality, drawn on a 24×24 grid with square edges using only the call palette, and shown wherever the teller's avatar appears: chat rows, chat headers, group avatars and the new-chat list. Mira's SHALL be a portrait of her; Sage's SHALL be his morning tea; Astra's SHALL be her rooftop telescope before dawn. A teller without a picture SHALL fall back to a pixel icon.

#### Scenario: Each teller has a picture
- **WHEN** the chat list shows chats with Mira, Sage and Astra
- **THEN** each row shows that teller's own 24×24 picture

#### Scenario: Group chat
- **WHEN** a group chat with Mira and Sage is listed
- **THEN** its row shows both pictures overlapping

#### Scenario: Unknown teller
- **WHEN** an avatar is shown for a teller with no picture
- **THEN** a pixel icon is shown instead

### Requirement: Tarot card backs
Face-down cards in Mira's fan SHALL show a pixel tarot card back with square edges: a navy card with a thin gold inner frame, a star at the centre, and corner pips. A picked card SHALL invert to a gold back with navy markings and stay raised, including while hovered.

#### Scenario: Picking a card
- **WHEN** the owner picks a face-down card
- **THEN** its back turns gold with navy markings and the other cards keep the navy back
