# Spec Delta

## MODIFIED Requirements

### Requirement: Teller presence in the call
The overlay SHALL show the teller's 3D model framed head and shoulders, with arms lowered from a T-pose. The framing SHALL be derived from the measured extent of the model's head, so the whole head is visible in the upper part of the frame for any humanoid proportions; if the head cannot be measured, the framing SHALL be derived from the head bone. While not speaking, the teller SHALL be in an idle state with breathing motion and blinks at irregular intervals. If the model fails to load, the overlay SHALL show the teller's avatar image and an error notice instead.

#### Scenario: Idle on open
- **WHEN** the call overlay opens and the model loads
- **THEN** the call state is idle and the teller breathes and blinks

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

### Requirement: Expressions follow the sentence
While the teller speaks a sentence, the teller's face SHALL show that sentence's expression (`happy`, `relaxed`, `surprised`, `sad` or neutral), and SHALL return to neutral when idle. If the model has no such expression, the face SHALL stay neutral for that sentence and the call SHALL continue.

#### Scenario: Happy sentence
- **WHEN** the teller speaks a sentence tagged `happy`
- **THEN** the call state's expression is `happy` until that sentence ends

#### Scenario: Model without the expression
- **GIVEN** the teller's model has no `surprised` expression
- **WHEN** the teller speaks a sentence tagged `surprised`
- **THEN** the face stays neutral, the mouth still follows the voice, and the call continues without an error
