# Spec Delta

## MODIFIED Requirements

### Requirement: Talking gestures
While the teller speaks, the body SHALL play a talking animation when one is available, choosing a different one from the previous turn when several exist. It SHALL keep gesturing through the short gaps between sentences of a reply and SHALL return to the idle animation shortly after speaking ends. Without talking animations, the body SHALL stay in its idle motion while speaking. Outside thinking, the teller's face SHALL stay within about 8° of the camera, whatever turn an animation gives the head or body, and SHALL tilt slightly down toward it.

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

#### Scenario: Facing the camera while talking
- **GIVEN** a talking animation turns the teller's head 24° to the side
- **WHEN** the teller speaks
- **THEN** the face stays within 8° of the camera, tilted slightly down, and still moves with the gesture

#### Scenario: Thinking still looks away
- **WHEN** the teller is thinking
- **THEN** the head turns away from the camera as before
