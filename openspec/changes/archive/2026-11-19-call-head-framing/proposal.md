## Intent

Frame every teller's face in a call, whatever the model's proportions, so stylized VRMs (Rose, Cosmic Person, Cactus Boy) can be used, not only VRoid-style humans.

ADRs reviewed: ADR-0015

## Why

The call camera is placed from the head bone's position with fixed offsets tuned for a human-proportioned VRoid model. The owner has picked stylized 100Avatars models for tarot, astrology and I Ching. On those, the head bone sits at the neck and the head is much larger, so the face lands at the top edge (Moon Girl, Cactus Boy) or out of frame entirely (the voxel versions). The models tested so far also lack some expressions (none has `surprised`, the low-poly ones have no emotions at all), and that must keep working rather than break a call.

## What Changes

- **Framing from the head's shape.** When a model loads, the call measures the part of the model that moves with the head (face, hair, helmet, ears) in its rest pose and places the camera so that whole head is in the upper part of the frame with the shoulders below it. The framing scales with the head's size, so a big-headed mascot is shown as fully as a human.
- **Fallback.** If the head can't be measured (no geometry bound to the head), the call uses today's head-bone framing.
- **Missing expressions.** A model without one of the expressions the call uses keeps a neutral face for it; the call keeps running and nothing is logged as an error. This already works and gets a regression scenario.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `voice-calls`: the teller is framed by the measured head rather than fixed offsets from the head bone; a model missing an expression shows neutral for it.

## Non-goals

- Choosing or installing models for Mira, Sage or an astrology teller, or enabling calls for Sage.
- Per-teller manual camera settings.
- Adding missing expressions to models.
- Changing the idle, thinking or lip-sync motion.

## Impact

- Frontend only: a pure `lib/call/framing.ts` (head bounds from vertex data, camera placement from bounds) with tests; `vrm-stage.ts` uses it in place of the fixed offsets.
- Docs: `docs/operations.md` notes that any humanoid VRM frames automatically.
