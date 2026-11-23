## Context

`vrm-stage.ts` plays `.vrma` clips with an `AnimationMixer` on the model's normalized bones, then slerps the thinking bones toward the thinking pose. The camera is fixed on the +Z axis looking back at the head. Measured head, neck, spine and hips yaw in the owner's clips: idle within ±5°; talk-1 head −22°..+24°, talk-2 head −11°..+9° with a 10° spine turn, talk-3 head up to +20°. These yaws add up along the chain, so while talking the face can point 20–30° away.

## Goals / Non-Goals

**Goals:**
- The face stays within about 8° of the camera whatever the clip does, without freezing the head.
- Thinking still turns the head away.

**Non-Goals:**
- Changing clips, the torso or the camera (proposal non-goals).

## Decisions

### 1. Soft limit on the head's world yaw
`facingCorrection(yaw, limit)` in `lib/call/pose.ts` returns the yaw to add so the result is `limit · tanh(yaw / limit)`. Small turns are almost untouched and large ones approach but never exceed `limit`. The result is smooth and keeps the clip's direction of motion, so the head still moves while staying in view. `FACING_LIMIT` is 8° (0.14 rad).

- *Alternatives:* a hard clamp (the head sticks at the limit and looks frozen); scaling the yaw tracks of the talking clips at load time (only fixes the head's own track, not the spine and hips under it).

### 2. Applied to the normalized head after the mixer and thinking
At load, in the rest pose, the stage stores the head's forward direction in its local frame (the inverse of the rest world rotation applied to +Z, so VRM 0.x and 1.0 need no special case). Each frame after `mixer.update` and the thinking slerp, it reads the head's world rotation, computes the yaw of its forward direction, and pre-multiplies a world Y rotation of `facingCorrection(yaw, FACING_LIMIT) · (1 − thinking)` into the head's local rotation. The same rotation also tilts the head `FACE_DOWN` (about 6°, 0.105 rad) about world X, also scaled by `1 − thinking`; the owner found the face looked too level after the first version. The correction only runs on the clip path; the procedural fallback sets the head directly and already faces the camera.

## Risks / Trade-offs

- [Neck looks twisted when a large body turn is undone only at the head] → measured turns stay under 30°, which the head absorbs believably; the torso keeps its natural angle.
- [Correction fights the thinking look-away] → scaled by `1 − thinking`, so it is gone at full thinking.

## ADR alignment

ADRs reviewed: ADR-0015, ADR-0019

- ADR-0015: the state machine still decides the body state; the renderer only adjusts how it executes the clip. Clips stay local and gitignored and are not modified.
- ADR-0019: the pixel filter and framing are unchanged; only the head's rotation changes before rendering.
