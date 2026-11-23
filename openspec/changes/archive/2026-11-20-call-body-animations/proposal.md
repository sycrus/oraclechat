## Intent

Make the teller's body move naturally in a call: a looping idle animation while listening and talking gestures while speaking, instead of a fixed pose with a small procedural sway.

ADRs reviewed: ADR-0002, ADR-0015

## Why

With Rose as Mira's model, the call looks rigid: the arms hang at a fixed angle and only the chest and neck sway slightly. The owner downloaded Mixamo clips (breathing idle, three talking clips, happy and sad idles, two sitting clips for later tellers) and they convert cleanly to VRM Animation (`.vrma`), which pixiv's own loader plays on any VRM 0.x or 1.0 model, fingers included.

## What Changes

- **Idle animation.** While idle or listening, the teller loops a breathing idle clip. Blinks, look-at, lip sync and expressions work as today; the procedural breathing sway is not used while a clip plays.
- **Talking gestures.** While speaking, the teller crossfades into a talking clip, a different one from the last when several exist, and keeps it through the short gaps between sentences. It returns to idle shortly after speaking ends.
- **Thinking.** The hand-near-chin pose blends over the idle clip while thinking, as today.
- **Framing.** The camera allows for where the idle clip puts the head, not only the T-pose.
- **Fallback.** If the clips are missing or fail to load, the call uses today's procedural motion.
- **Assets and tooling.** Clips live in `frontend/app/public/animations/` and are gitignored. A committed Blender script converts Mixamo FBX (without skin) to `.vrma`; `docs/operations.md` explains how to get and convert clips.
- **Dependency.** `@pixiv/three-vrm-animation` (pixiv, MIT), the VRM Animation loader from the three-vrm project.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `voice-calls`: idle shows a looping idle animation when available; speaking shows talking gestures; thinking blends over the idle animation.

## Non-goals

- Happy or sad idle clips chosen by expression, and sitting tellers (later changes).
- Choosing clips per teller in the teller definition.
- Lip-synced gestures or gestures timed to words.
- Committing any animation file.

## Impact

- Frontend: new dependency `@pixiv/three-vrm-animation`; a pure `lib/call/clips.ts` (which clip to play, talk hold, next talking clip) with tests; `vrm-stage.ts` loads and plays clips with an `AnimationMixer` and takes the call's body state; `call-overlay.tsx` passes the body state.
- Tooling: `scripts/mixamo-to-vrma.py` (Blender + VRM add-on).
- Config: `.gitignore` for `frontend/app/public/animations/`.
- Docs: `docs/operations.md`.
