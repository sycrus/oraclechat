# Spec Delta

## ADDED Requirements

### Requirement: Talking gestures
While the teller speaks, the body SHALL play a talking animation when one is available, choosing a different one from the previous turn when several exist. It SHALL keep gesturing through the short gaps between sentences of a reply and SHALL return to the idle animation shortly after speaking ends. Without talking animations, the body SHALL stay in its idle motion while speaking.

#### Scenario: Gestures while speaking
- **GIVEN** talking animations are available
- **WHEN** the teller starts speaking a sentence
- **THEN** the body moves from the idle animation into a talking animation

#### Scenario: Gap between sentences
- **GIVEN** the teller is speaking a reply of several sentences
- **WHEN** one sentence ends and the next starts within a second
- **THEN** the body keeps the same talking animation without returning to idle

#### Scenario: Back to idle
- **WHEN** the teller finishes speaking and nothing follows
- **THEN** the body returns to the idle animation within about two seconds

#### Scenario: Varied gestures
- **GIVEN** three talking animations are available
- **WHEN** the teller speaks in two consecutive turns
- **THEN** the second turn uses a different talking animation from the first

## MODIFIED Requirements

### Requirement: Teller presence in the call
The overlay SHALL show the teller's 3D model framed head and shoulders, with arms lowered from a T-pose. The framing SHALL be derived from the measured extent of the model's head, so the whole head is visible in the upper part of the frame for any humanoid proportions; if the head cannot be measured, the framing SHALL be derived from the head bone. While not speaking, the teller SHALL be in an idle state, playing a looping idle animation when one is available and otherwise a procedural breathing motion, with blinks at irregular intervals. If the model fails to load, the overlay SHALL show the teller's avatar image and an error notice instead.

#### Scenario: Idle on open
- **WHEN** the call overlay opens and the model loads
- **THEN** the call state is idle and the teller breathes and blinks

#### Scenario: Idle animation
- **GIVEN** an idle animation is available
- **WHEN** the call overlay opens and the model loads
- **THEN** the teller loops the idle animation, blinks, and the whole head stays in frame

#### Scenario: Animations unavailable
- **GIVEN** the animation files are missing or fail to load
- **WHEN** the call overlay opens
- **THEN** the teller stands with arms lowered and breathes procedurally, and the call works as before

#### Scenario: Missing model file
- **GIVEN** the teller's model file is missing
- **WHEN** the call overlay opens
- **THEN** the overlay shows the avatar image and a "model unavailable" notice
- **AND** the overlay stays usable with subtitles

#### Scenario: Human-proportioned model
- **GIVEN** a VRoid-style model whose head is about an eighth of its height
- **WHEN** the call overlay opens
- **THEN** the whole head is visible in the upper part of the frame with the shoulders below it

#### Scenario: Large-headed stylized model
- **GIVEN** a stylized model whose head bone sits at the neck and whose head is a third of its height
- **WHEN** the call overlay opens
- **THEN** the whole head, including anything worn on it, is visible in the upper part of the frame

#### Scenario: VRM 0.x model
- **GIVEN** the teller's model is a VRM 0.x file
- **WHEN** the call overlay opens and the teller later thinks
- **THEN** the arms are lowered from the T-pose, not raised, and the breathing and thinking poses move the same way as on a VRM 1.0 model

#### Scenario: Head cannot be measured
- **GIVEN** a model with no geometry that moves with the head
- **WHEN** the call overlay opens
- **THEN** the camera is placed from the head bone and the call works as before

### Requirement: Thinking while waiting
After a call message is sent and until the first sentence is spoken, the teller SHALL be in a thinking state, posed with a hand near the chin and looking away from the camera, with "…" as the subtitle. If the turn fails or produces no sentences, the teller SHALL return to idle and the overlay SHALL show an error.

#### Scenario: Thinking before the first sentence
- **WHEN** the owner sends a call message
- **THEN** the call state is thinking until the first sentence starts playing

#### Scenario: Thinking over the idle animation
- **GIVEN** the idle animation is playing
- **WHEN** the teller starts thinking
- **THEN** the hand moves toward the chin and the head turns away, eased in over the idle animation, and eased out when thinking ends

#### Scenario: Failed turn
- **WHEN** the turn ends with an error
- **THEN** the call returns to idle and shows the error
