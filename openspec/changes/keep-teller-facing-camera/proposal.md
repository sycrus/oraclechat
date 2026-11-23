## Intent

Keep the teller's face toward the camera while they talk in a call, so a talking gesture never turns them away from the owner.

ADRs reviewed: ADR-0015, ADR-0019

## Why

The owner noticed that tellers stop facing the camera when they talk. The three Mixamo talking clips swing the head well off-axis: measured from the `.vrma` files, talk-1 turns the head between −22° and +24°, talk-3 up to +20°, and the spine and hips hold a further 5–10° turn for the whole clip. The idle clip stays within a few degrees. The call camera is fixed, so the face turns away whenever a teller speaks.

## What Changes

- **Face kept to the camera.** Each frame after the body animation, the head's sideways turn (yaw) is eased back toward the camera: small turns pass almost unchanged, and larger ones are squeezed to stay within about 8°. The clip's nods, tilts and gestures are kept.
- **Slight downward tilt.** The head is tilted about 6° down so the teller looks at the owner rather than past them; the owner asked for it after trying the first version.
- **Thinking unchanged.** The thinking look-away is not corrected; the correction fades out as thinking eases in.
- **Procedural fallback unchanged.** Without an idle clip, the procedural pose already faces the camera.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `voice-calls`: Talking gestures keep the teller's face toward the camera.

## Non-goals

- Re-exporting or editing the animation clips.
- Turning the torso or hips back toward the camera.
- Eye contact through look-at (eyes already follow the head).

## Impact

- Frontend: a pure `facingCorrection(yaw, limit)` in `lib/call/pose.ts` with tests; `vrm-stage.ts` applies it to the head after the mixer update.
