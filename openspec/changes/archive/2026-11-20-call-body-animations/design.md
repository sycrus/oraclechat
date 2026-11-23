## Context

`vrm-stage.ts` poses the model procedurally every frame: upper arms set once to `±ARM_DOWN`, chest and neck swayed by `breathing(t)`, and the thinking pose (`thinkingPose(weight)`) written as absolute Euler angles on the right arm, forearm, hand and head, all through `orientFor` for VRM 0.x. The stage receives `{ thinking, expression }`; the call state machine (`lib/call/state.ts`) also knows `speaking`, but returns to `idle` after each sentence until the next one's audio starts, so `body` flickers to idle between sentences.

A headless check (Chrome, three 0.180, three-vrm 3.5.5, `@pixiv/three-vrm-animation` 3.5.5) played the owner's converted clips on Rose (VRM 0.x): 53 tracks per clip (52 humanoid bones plus hips position), arms relaxed, fingers moving, no axis problems. Conversion: Blender 5.1 + VRM add-on 4.4.0, importing the Mixamo FBX, mapping `mixamorig:*` bones to VRM 1.0 human bones, and `export_scene.vrma`.

## Goals / Non-Goals

**Goals:**
- Idle and talking clips driven by the existing call state, crossfaded, with today's procedural motion as the fallback.
- Thinking, blink, look-at, lip sync and expressions unchanged in behaviour.

**Non-Goals:**
- Expression-driven idle variants, sitting, per-teller clip sets (proposal non-goals).

## Decisions

### 1. Play VRM Animation with pixiv's loader
Clips are `.vrma` loaded with `VRMAnimationLoaderPlugin` and turned into `AnimationClip`s with `createVRMAnimationClip(anim, vrm)`, played by one `THREE.AnimationMixer` on `vrm.scene`. The loader retargets to the model's normalized bones and handles VRM 0.x itself. A `VRMLookAtQuaternionProxy` is added before creating clips, as the library recommends.

- *Alternatives:* load Mixamo FBX at runtime with three-vrm's retargeting example (copied code to maintain, FBX parsing in the browser, raw Mixamo files served); hand-written procedural gestures (would not look natural).

### 2. Convert offline with a committed Blender script
`scripts/mixamo-to-vrma.py` (run with `blender -b --python … -- <out_dir> <fbx…>`) maps the 52 `mixamorig:*` bones (body, shoulders, toes, all fingers) to VRM 1.0 human bones and exports `.vrma`. Output names are the FBX names in kebab case. It needs Blender with the VRM add-on, documented in `docs/operations.md`.

### 3. Fixed file set, shared by all tellers
`public/animations/idle.vrma` and `public/animations/talk-1.vrma`, `talk-2.vrma`, `talk-3.vrma`. The stage tries all four; any that fail are skipped (logged with `[call]`). No idle clip means the full procedural fallback; no talking clip means the idle clip continues while speaking. Per-teller sets wait for a teller that needs different ones.

### 4. Clip choice is a pure function with a talk hold
`lib/call/clips.ts`:
- `clipFor(body, msSinceSpeaking, hasTalk)` → `"idle" | "talk"`: `talk` while `body === "speaking"` and for `TALK_HOLD_MS` (1200 ms) after the last speaking frame, so gaps between sentences don't drop to idle; otherwise `idle`. Thinking uses `idle` (the thinking pose blends over it).
- `nextTalk(count, previous, random)` → index of a talking clip different from `previous` when `count > 1`.

The stage tracks the last time `body` was `speaking`, calls `clipFor` each frame, and on a change crossfades (`crossFadeTo`, 0.4 s). Entering `talk` picks `nextTalk`.

### 5. The stage takes the body state
`setState({ body, expression })` replaces `{ thinking, expression }`; `call-overlay.tsx` passes `state.body`. Thinking is `body === "thinking"`. This keeps ADR-0015's split: the state machine decides, the stage only picks the clip that matches.

### 6. Thinking blends over the clip
Each frame, after `mixer.update`, the thinking bones (right upper arm, forearm, hand, head) are slerped from the clip's pose toward the full thinking pose (`thinkingPose(1)` through `orientFor`) by the eased thinking weight. With no clip, today's absolute pose path is kept. Breathing sway and the fixed `ARM_DOWN` are applied only in the fallback.

### 7. Framing allows for the idle pose
The head is measured in the rest pose as today, then shifted by how far the head bone moves between the rest pose and the idle clip's first frame (a pure `shiftHead(bounds, dy, dz)` in `framing.ts`). Clips are in place, so the shift is small, but it keeps a slouching or leaning idle framed.

## Risks / Trade-offs

- [Clip hips track moves the model off centre] → Mixamo "in place" clips keep hips near the origin; the headless check showed Rose centred. A clip that drifts is a bad clip, not handled.
- [Thinking hand on a clip looks different from today] → blend weights and the hold are checked in the headless stage and a live call.
- [Mixamo terms] → files stay local and gitignored, never redistributed; only the converter script is committed.
- [One more dependency] → from the same maintainers and release train as `@pixiv/three-vrm`; versions pinned together.

## Migration Plan

Frontend and tooling only. Without the clip files the call behaves as before, so deploying before converting clips is safe. Rollback is reverting the commit.

## ADR alignment

ADRs reviewed: ADR-0002, ADR-0015

ADR-0015 keeps rendering in three.js with `@pixiv/three-vrm`, an app-owned state machine deciding body state, and assets out of git. `@pixiv/three-vrm-animation` is part of the same VRM rendering stack; the stage still only executes the state machine's body state; clips are gitignored like models and voices. ADR-0002 (local-first): clips are local files and conversion runs locally. No new ADR is needed.
