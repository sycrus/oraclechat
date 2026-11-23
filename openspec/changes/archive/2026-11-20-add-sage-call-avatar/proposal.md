# Proposal

## Intent

Make Sage callable in video calls exactly like Mira: his own 3D avatar, his own locally cloned voice, and a call button in a 1:1 chat.

## Why

Only Mira can be called today (ADR-0015 shipped calls with her avatar and voice alone). Sage is half of the MVP roster and his reading style — sitting with feelings — is arguably where a face-to-face call helps most. The call pipeline is already teller-agnostic after the framing work (ddef022): what is missing is Sage's assets and two config lines.

## What Changes

- Add Sage's 3D model: the CC0 100Avatars Cactus Boy low-poly VRM installed at `frontend/app/public/tellers/sage/sage.vrm` (gitignored asset, path documented).
- Add `model: "/tellers/sage/sage.vrm"` to the frontend teller list so `callableTeller` offers the call button for Sage in 1:1 chats.
- Add `call: voice: sage` to `backend/agent/src/tellers/definitions/sage.yaml` so the backend synthesizes with Sage's voice reference.
- Generate the voice clone prompt `services/tts/voices/sage.wav` (+ `.txt`) with `make_voice.py sage --instruct ...` (gitignored, like Mira's).
- Update the two voice-calls scenarios that used Sage as the no-call example, and add Sage call-path scenarios.
- Update `docs/operations.md` so the call setup covers Sage's assets as well as Mira's.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `voice-calls`: The "Call entry point" requirement's negative scenario stops using Sage as the teller without calls, and gains a Sage scenario. The "Local speech synthesis" requirement's negative scenario likewise stops naming Sage and gains a Sage voice scenario. No SHALL statement changes — the requirements were already teller-generic.

## Impact

- `frontend/app/src/app/chat-workspace.tsx` (static teller list), `frontend/app/src/app/call/call-overlay.test.tsx` (Sage callable expectation), `backend/agent/src/tellers/definitions/sage.yaml`, `docs/operations.md`.
- Two gitignored assets downloaded/generated on this PC: `frontend/app/public/tellers/sage/sage.vrm`, `services/tts/voices/sage.{wav,txt}`.
- No backend speech code changes: `routes.ts` already resolves any teller's `call.voice`.
- VRAM unchanged: OmniVoice serves both voices from one loaded model.

## Non-goals

- No astrology teller and no use of the Cosmic Person avatar.
- No change to the call pipeline, state machine, framing, lip sync, or animations — all are already model-generic.
- No Voxel avatar for Sage (owner chose low-poly; no `happy`/`relaxed`/`sad` faces — sentences tagged with those expressions stay neutral per the existing spec).
- No supervision of the TTS sidecar (left to a later change, per ADR-0015).

ADRs reviewed: ADR-0015, ADR-0016, ADR-0013, ADR-0010, ADR-0002
