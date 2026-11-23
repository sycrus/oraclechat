## Intent

Let the owner open a video call with Mira: a 3D Mira on screen who speaks in her own voice, generated on the PC.

## Why

Tellers are text-only today. A face and a voice make a teller feel like a friend on a call rather than a chat log, and the PC already has a fast local TTS model (OmniVoice) and the GPU headroom to run it. This change is milestone 1: prove the voice, 3D and state-machine pipeline with typed sentences before wiring in the language model.

## What Changes

- **Call button.** Tellers whose definition has a `call:` section show a video call button in the chat header. For now only Mira has one.
- **Call overlay.** A full-screen overlay in the chat page shows the teller's VRM model, framed head and shoulders, idling (breathing and blinking) and lowered out of its T-pose. An end-call button closes it.
- **Say a sentence (M1).** A text box in the overlay sends a typed sentence to be spoken verbatim. No language model is involved in M1.
- **Local speech.** A new Python sidecar (`services/tts`, started with `pnpm tts`) runs OmniVoice on the GPU and clones the teller's voice from a reference clip. The backend exposes `POST /api/tts`, which forwards to the sidecar at `TTS_BASE_URL` and returns WAV audio. Speech is always local, even when hosted replies are on.
- **Call state machine.** An app-owned TypeScript state machine drives body states (`idle`, `speaking`, `ended`) and a separate expression layer. The renderer (Three.js with `@pixiv/three-vrm`) only plays what the state says.
- **Lip sync.** The mouth opens with the loudness of the playing audio.
- **Voice offline.** If the sidecar is unreachable, the overlay still opens, shows a "voice offline" notice, and shows the sentence as a subtitle. Nothing falls back to another voice.
- **Tracing.** `/api/tts` produces a span with timing, teller id, character count and outcome, never the text or audio.
- **Assets.** `.vrm` models and voice reference clips stay out of git; their paths are documented.
- **ADR-0015** (Proposed) records local voice calls.

## Capabilities

### New Capabilities
- `voice-calls`: video call overlay, call state machine, local speech synthesis through the backend, lip sync, and voice-offline behavior.

### Modified Capabilities
- `tellers`: teller definitions may declare an optional `call:` section (model path, voice reference) that enables calls for that teller.

## Non-goals

- Sending call messages to the language model, streaming replies sentence by sentence, or emotion tags (milestone 2).
- Voice input, speech recognition, or interrupting the teller.
- Vowel-shape (viseme) lip sync, body animation clips, or tarot cards in the call.
- Calls for Sage, or the final Mira model and voice.
- Running the sidecar under the production supervisor (ADR-0010); it is started by hand for now.

## Impact

- Frontend: `three` and `@pixiv/three-vrm` dependencies; new call overlay, state machine and lip-sync modules; chat header button.
- Backend: `POST /api/tts` route, TTS client, teller `call` config, `TTS_BASE_URL` setting.
- New `services/tts` Python service with its own virtual environment; `pnpm tts` script; `OMNIVOICE_MODEL_PATH` setting.
- GPU: OmniVoice stays loaded alongside `qwen3.5:9b` on the 16 GB card.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0004, ADR-0007, ADR-0010, ADR-0013, ADR-0014
