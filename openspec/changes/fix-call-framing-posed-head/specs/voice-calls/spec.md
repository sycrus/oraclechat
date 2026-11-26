## MODIFIED Requirements

### Requirement: Teller presence in the call
The overlay SHALL show the teller's 3D model framed head and shoulders, with arms lowered from a T-pose. The framing SHALL be derived from the measured extent of the model's head, as the head is posed when the call opens, so the whole head is visible and horizontally centred in the upper part of the frame for any humanoid proportions and any idle pose; if the head cannot be measured, the framing SHALL be derived from the head bone. While not speaking, the teller SHALL be in an idle state, playing a looping idle animation when one is available and otherwise a procedural breathing motion, with blinks at irregular intervals. Body animations SHALL play in place: the teller may sway, bend and gesture but SHALL NOT drift across the floor. If the model fails to load, the overlay SHALL show the teller's avatar image and an error notice instead.

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

#### Scenario: Body animation would drift the teller
- **GIVEN** a teller whose idle and talking animations move the hips sideways across the floor
- **WHEN** the call overlay opens on a phone-shaped window and the teller idles and then speaks
- **THEN** the teller stays in place and the camera stays centred on the head
- **AND** the whole head, including its top, stays visible in the upper part of the frame throughout
