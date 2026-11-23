# Spec Delta

## ADDED Requirements

### Requirement: Pixel-filtered teller render
The call SHALL draw the teller's 3D render at a low resolution, about 160 pixels across on a phone, and scale it up to fill the screen without smoothing. Every rendered pixel SHALL be snapped to the nearest colour in a fixed 16-colour call palette, made of the interface palette plus skin, hair and clothing tones. The filter SHALL NOT change the model's framing, animation, expressions or mouth movement. If the filter cannot be set up, the call SHALL fall back to the unfiltered render and keep working.

#### Scenario: Filtered render
- **WHEN** a call opens and the model loads
- **THEN** the teller is drawn in large square pixels using only the call palette

#### Scenario: Nearest colour
- **WHEN** a rendered pixel's colour lies between two palette colours
- **THEN** it is drawn in whichever is nearer

#### Scenario: Filter unavailable
- **GIVEN** the screen offers no 2D drawing context for the filtered frame
- **WHEN** a call opens
- **THEN** the unfiltered render is shown and the call works as before

### Requirement: Call screen layout
The call screen SHALL fill the window with the teller's render.
- **Top bar:** the teller's name in the title font and a status line (connecting, speaking or thinking, voice offline, or microphone unavailable), with the call note beside it.
- **Subtitles:** shown above the call bar.
- **Call bar:** one full-width bar along the bottom edge, solid so it covers the bottom of the render: the typed input, send, the microphone toggle when the microphone is usable, and end call in the danger colour, all on one line. There is no separate messages control; the typed input is always there.
- **Framing:** on a phone-shaped window the camera keeps to the teller's head and shoulders, the head nearly filling the width, so the body below the waist stays out of view.

#### Scenario: Typing in a call
- **WHEN** the user types in the call bar and sends
- **THEN** the message is sent as before, from the same line as the microphone and end-call controls

#### Scenario: No microphone
- **GIVEN** the microphone is blocked
- **WHEN** the call opens
- **THEN** the call bar has the typed input, send and end call, no microphone toggle, and the status line says to type instead
