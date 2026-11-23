# ADR-0016: Local speech recognition for calls

**Status:** Accepted
**Date:** 2026-11-19
**Supersedes:** None

## Context

ADR-0015 made teller speech local: an OmniVoice sidecar on `127.0.0.1`, reached only through the backend. The owner now wants to talk in calls as on a real voice call, which means recognising the owner's speech. Owner audio is more sensitive than generated speech: it is the owner's own voice, in their home. ADR-0002 keeps model execution local by default, and ADR-0014 allows hosted teller *text* only. The PC already has Whisper large-v3-turbo weights, and the sidecar already runs torch and transformers on the GPU.

## Decision

- **Recognition is local only.** Owner speech is transcribed by Whisper in the existing speech sidecar (`services/tts`, `POST /transcribe`), loaded from `WHISPER_MODEL_PATH`. No hosted speech-to-text is used, including when hosted teller replies are on.
- **The backend owns recognition.** The browser sends each spoken turn to the backend (`POST /api/stt`), which validates it and calls the sidecar.
- **Owner audio is transient.** It is not stored, logged or traced. Each request produces an `oracle.stt` span with outcome, duration and character count only.
- **A transcript is a message.** Once transcribed, it is sent exactly as a typed call message, so routing, memory and hosted replies treat it like text.
- **Turn detection is in the browser**, on the app's own audio graph with the browser's echo cancellation. The model choice for detection is an implementation detail of the change.
- **No fallback recogniser.** If recognition is unavailable, calls show a notice and typing keeps working.

## Consequences

- Speech never leaves the PC in either direction, but the GPU must also hold Whisper (about 1.6 GB) next to OmniVoice and the chat model.
- One Python process serves both directions and shares one GPU lock, so a transcription can wait behind a synthesis and the other way round.
- Swapping the recognition model only touches the sidecar, because the `/api/stt` contract is independent of it.

## Validation

- Tests verify that `/api/stt` rejects invalid audio, returns 503 when recognition is offline, calls only the configured sidecar, and records spans without text or audio.
- A live check confirms a spoken turn is transcribed locally and answered, and that stopping recognition shows the notice while typing still works.
