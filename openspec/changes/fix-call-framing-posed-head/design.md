## Context

- `measureHead()` in `vrm-stage.ts` read head vertices from the geometry's bind positions, in the rest pose. After the idle clip's first frame, `shiftHead()` moved the bounds by the head bone's change in y and z only. The camera sat at x = 0.
- Measured live (`[framing-debug]` logging, since removed): at the idle clip's first frame every teller's head is centred to within 1.3 cm. Screenshots over 10 s show the teller drifting sideways through the loop. The shared Mixamo clips translate the hips, so the camera framed a moment, not the call.
- Sizes: Milo's head bone is at 1.26 m and the top of his cone at 1.56 m; his phone frame is about 0.42 m wide.

## Decision

- **Play body clips in place.** After every `mixer.update` (and when the clip's first frame is applied for framing), reset the normalized hips bone's x and z position to its rest value. Rotations and the hips' height keep animating.
- **Measure the head in the pose.** `measureHead()` puts each head vertex through `SkinnedMesh.applyBoneTransform()` (three r180) before the mesh's world matrix. It runs after the idle clip's first frame, with the hips pinned, or at rest without an idle clip. Its `base` is the posed head bone's height.
- **Centre horizontally.** `HeadBounds` gains `centerX`, the midpoint of the head's x extent. `Framing` gains `x`, which the stage uses to place and aim the camera.
- `shiftHead()` is removed, since measuring in the pose replaces it. The head-bone fallback is unchanged.

Rejected after a live trial:
- *Centring alone.* The drift happens after the call opens, so a centred first frame still drifts out.
- *Framing the union of the head's extent across sampled poses of every clip.* This kept the head in view, but the phone width rule then pulled the camera back to show the teller down to the knees, which breaks head-and-shoulders.
- *Also applying the face-the-camera correction before measuring.* This measured a pose the render never shows and put tellers off-centre.

## TDD and verification

- `framing.test.ts`: failing cases first. `frameHead` returns `x` equal to `centerX`, and existing fixtures gain `centerX`.
- Pinning the hips and skinned measurement only run on real three.js objects in the browser, so they are verified live: phone screenshots of all four tellers at 3, 5.5, 8 and 10.5 s into the idle loop, plus Milo while speaking in `?say=1` mode.

## ADR alignment

ADRs reviewed: ADR-0015, ADR-0019

- ADR-0015: calls still render the local VRM head-and-shoulders with the shared body clips. The clips now play in place, and the gestures are unchanged.
- ADR-0019: the pixel filter is applied after rendering and is unaffected by the pose or camera placement.
