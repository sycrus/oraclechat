# ADR-0015: Local voice calls with a 3D teller

**Status:** Accepted
**Date:** 2026-11-19
**Supersedes:** None

## Context

The owner wants to "video call" a teller: a 3D figure that speaks in the teller's own voice. ADR-0002 keeps model execution local by default, ADR-0014 allows hosted teller *text* only, and ADR-0010 runs Oracle on the owner's PC (RTX 5080, 16 GB). The PC already has OmniVoice TTS weights. The maintained Babylon.js VRM loaders only support VRM 0.x on Babylon 5, while `@pixiv/three-vrm` supports VRM 0.x and 1.0 and is maintained by VRoid's publisher.

## Decision

- **Speech is local only.** A Python sidecar in `services/tts` runs OmniVoice on the GPU, bound to `127.0.0.1`. No hosted speech provider is used, including when hosted teller replies (ADR-0014) are on.
- **The backend owns speech.** The browser asks the backend (`POST /api/tts`), which checks the teller and calls the sidecar at `TTS_BASE_URL`. Each request produces an `oracle.tts` span with metadata only: no text, audio or paths.
- **No fallback.** If the sidecar is unset or down, calls show "voice offline" with subtitles. No other voice is substituted.
- **Voices are named.** A teller's `call.voice` names a reference clip in the sidecar's `voices/` folder. Voices are cloned from that clip so they stay consistent.
- **Rendering.** Three.js with `@pixiv/three-vrm` renders VRM models. An app-owned TypeScript state machine decides body state and expression; the renderer only executes it.
- **Assets stay out of git.** `.vrm` models, voice clips and the sidecar's virtual environment are gitignored, with their paths documented.
- **Manual start for now.** The sidecar is started with `pnpm tts` and is not yet supervised by `oracle-up.ps1`.

## Consequences

- Calls work offline and leak nothing beyond the PC, but need the GPU to hold OmniVoice beside the chat model.
- A second runtime (Python) joins the stack, with its own environment to install.
- Swapping the renderer or the TTS engine only touches one module, because the state machine and the `/api/tts` contract are independent of both.
- A model or voice file missing on a fresh clone degrades the call instead of breaking the build.
- A later ADR or change adds the sidecar to the production supervisor.

## Validation

- Tests verify that `/api/tts` rejects tellers without `call`, returns "voice offline" without a URL or with a failing sidecar, never calls any other endpoint, and records spans without text.
- Tests verify the call state machine and lip sync independently of rendering.
- A live check confirms Mira speaks a typed sentence with her mouth moving, and that stopping the sidecar shows "voice offline" with subtitles.
