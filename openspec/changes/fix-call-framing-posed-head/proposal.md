## Why

Keep every teller's head in the call frame for the whole call, by playing body animations in place and framing the head where the animation puts it.

On a phone, Milo's call showed his chest with his head partly out of frame. The shared Mixamo idle and talking clips move the hips across the floor, so the whole teller drifts sideways while the camera stays fixed. Measured live, Milo's head is centred when the call opens, but the drift then carries it about 10 cm each way. That is a large share of his narrow phone frame, because he is the shortest model (hips at 0.86 m against Astra's 1.02 m). The other tellers drift the same way, less visibly.

## What Changes

- Body clips (idle and talking) play in place: each frame the hips keep their rest position across the floor (x and z). Rotations and the hips' height still animate, so the teller still sways, bends and gestures.
- The head is measured from its skinned vertices in the pose the idle clip starts in, not the rest pose plus a bone offset.
- The camera is centred horizontally on the measured head as well as vertically and in depth.

## Non-goals

- A camera that follows the head during the call; framing stays fixed once placed.
- Changing how much of the body is shown, the headroom, or the phone width rule.
- Changing the facing correction, thinking pose or procedural fallback.

## Impact

- `frontend/app/src/lib/call/framing.ts` and its tests; `frontend/app/src/app/call/vrm-stage.ts`.
- Spec: `voice-calls`, Teller presence in the call. Adds a regression scenario for drifting body clips.

ADRs reviewed: ADR-0015, ADR-0019
