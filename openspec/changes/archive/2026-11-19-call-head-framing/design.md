## Context

`vrm-stage.ts` frames the call once after load: camera at `(0, head.y + 0.02, 1.6)` looking at `(0, head.y - 0.1, 0)`, 24° vertical FOV, where `head` is the raw head bone's world position. Those numbers suit a 1.6 m VRoid human whose head bone is at the base of the skull. Headless checks of the 100Avatars picks (three-vrm 3.5.5, same loader steps) showed the face at the top edge for Moon Girl and Cactus Boy (low-poly) and out of frame for the voxel versions, whose heads are a third of their height. All of them are VRM 0.x; the low-poly ones bind only the vowels and blink, the voxel ones add `happy`, `relaxed`, `sad`, and none has `surprised`.

## Goals / Non-Goals

**Goals:**
- One framing rule that shows the whole head, top-weighted, for VRoid humans and stylized mascots, recomputed on resize.
- Keep today's framing as the fallback.

**Non-Goals:**
- Animated or tracking cameras; framing stays fixed after load and on resize.
- Per-model configuration.

## Decisions

### 1. Measure the head top from geometry that moves with the head
Collect, in the rest pose, every vertex whose strongest skin weight is the head bone or one of its descendants (hair, ears, helmet bones), plus all vertices of meshes parented under the head. The highest such vertex is the head top; the head bone's world height is the head base. Head size `h = top − base`; head width is the horizontal extent of the same vertices, ignoring those below the base.

- *Why the head bone for the base, not the lowest head vertex:* VRoid hair is weighted to head descendants and can reach the waist, which would make `h` several times too large.
- *Alternatives:* everything above the neck (catches raised arms, e.g. Cactus Boy's, and shoulder armor); whole-model bounds (gives the top but no head size); per-teller offsets in config (needs hand-tuning per model, and the user is collecting several).

### 2. Place the camera with a pure function
`lib/call/framing.ts` exports `frameHead({ top, base, width, centerZ }, fovDeg, aspect)` → `{ cameraY, targetY, distance }`:
- visible height `V = max(K·h, width·W / aspect)`, so a wide head still fits in a portrait window;
- frame top sits a margin `M·h` above the head top; the target is the frame's centre, `top + M·h − V/2`;
- distance `= (V/2) / tan(fov/2)`, camera at `(0, targetY, centerZ + distance)` looking at `(0, targetY, centerZ)`.

`K`, `M`, `W` are constants chosen so the current VRoid sample's framing stays within about 10% of today's (`V ≈ 0.68 m`); the test pins them. A second pure helper picks head vertices from skin indices/weights and a set of head bone indices, so the selection rule is unit-tested without three.js.

### 3. Fallback
No head vertices, or `h ≤ 0`: use today's offsets from the head bone.

### 4. Missing expressions need no code
three-vrm's `expressionManager.setValue` ignores names the model lacks, so `surprised` on Moon Girl is a no-op and the face stays neutral. The scenario is verified in the live check, not with new code.

### 5. Poses on VRM 0.x models
The stage sets Euler angles on normalized bones, and the angles in `lib/call/pose.ts` assume VRM 1.0 axes. three-vrm keeps a VRM 0.x model's normalized bones in its original space, turned 180° about Y from VRM 1.0 (`rotateVRM0` turns the scene, not the bones). Turning 180° about Y negates the X and Z axes, so an XYZ Euler `(x, y, z)` in VRM 1.0 terms is `(−x, y, −z)` on a VRM 0.x bone. A pure `orientFor(angles, vrm0)` in `pose.ts` applies that, and every rotation the stage sets (lowered arms, breathing, thinking pose) goes through it; `vrm0` comes from `vrm.meta.metaVersion === "0"`. This is the same flip three-vrm's Mixamo retargeting example applies to VRM 0.x.

- *Alternatives:* re-export the models as VRM 1.0 in Blender (per-model work the owner would repeat for every pick); mirror the angle constants for VRM 0.x (duplicates every pose).
- Look-at stays as is: three-vrm applies `lookAt` yaw and pitch in the model's own frame for both versions.

## Risks / Trade-offs

- [A model's head bone is far above the chin] → the chin can fall below the frame top-weighting; mitigated by `K` leaving room below the base; checked on all seven models in the live check.
- [Tall headwear makes the face small] → accepted; the spec asks for anything worn on the head to be visible.
- [Vertex scan cost on load] → one pass over ~50k vertices once per call open; negligible.

## Migration Plan

Frontend-only; no data or config changes. Rollback is reverting the commit.

## ADR alignment

ADRs reviewed: ADR-0015

ADR-0015 keeps rendering in three.js with `@pixiv/three-vrm`, with an app-owned state machine deciding behaviour and the renderer only executing it. Framing is renderer-side presentation computed from the loaded model; it adds no state, no dependency and no asset. Models stay gitignored. No new ADR is needed.
