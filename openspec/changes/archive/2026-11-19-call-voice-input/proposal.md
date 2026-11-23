## Intent

Let the owner talk to Mira out loud in a call, the way a real voice call works: the mic is open, a pause ends the owner's turn, and speaking while Mira talks interrupts her.

ADRs reviewed: ADR-0002, ADR-0004, ADR-0009, ADR-0010, ADR-0014, ADR-0015

## Why

M1–M3 made Mira speak, emote and show her cards, but the owner still types. A call where only one side talks is not a call. The PC already has the local Whisper large-v3-turbo weights and a GPU speech sidecar, so speech recognition can stay on the PC.

## What Changes

- **Open mic.** When a call starts, the overlay asks for the microphone with the browser's echo cancellation and noise suppression on. A mic button mutes and unmutes it. Typing still works.
- **Turn detection.** A voice detector in the browser finds the start and end of the owner's speech. About 0.8 s of silence ends a turn. Very short noises are ignored, and long turns are cut at 20 s.
- **Transcription.** Each turn is sent as a 16 kHz WAV through the backend (`POST /api/stt`) to a new `POST /transcribe` on the local speech sidecar, which runs Whisper large-v3-turbo on the GPU. Empty transcripts are dropped.
- **Send immediately.** The transcript is sent as a call message, exactly like a typed one, and shown as the owner's caption while Mira thinks.
- **Interrupting.** If the owner speaks for long enough while Mira is thinking or speaking, her audio stops and her remaining sentences for that turn are dropped. Her full reply is still saved to the chat. The new message is sent once her turn's stream has finished.
- **Degrading.** If the mic is blocked or missing, or recognition is offline, the call shows a notice and typing still works.
- **Privacy.** Owner audio is never stored, logged or traced; spans hold durations and counts only. No hosted speech-to-text, including with hosted replies on.
- **ADR-0016** records local speech recognition in the speech sidecar.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `voice-calls`: spoken owner input with an open mic, mute, turn detection, local transcription, interrupting, and degraded modes.

## Non-goals

- Voice input outside calls, in group conversations or with Sage.
- Wake words, push-to-talk, or speaker identification.
- Streaming (partial) transcripts or replies that start before the owner finishes.
- Languages other than English.
- Supervising the sidecar in `oracle-up.ps1` (still a separate follow-up).
- A learned voice detector (e.g. Silero); the energy detector is replaced only if the live check shows it is not good enough.

## Impact

- Sidecar (`services/tts`): Whisper engine, `POST /transcribe`, a health field, `WHISPER_MODEL_PATH`; about 1.6 GB more VRAM.
- Backend: `SpeechClient.transcribe`, `POST /api/stt` with an `oracle.stt` span, and an `stt` field on `/api/tts/health`.
- Frontend: mic capture worklet, pure `vad.ts` and `wav.ts`, an `interrupt` event in the call state, the mic button and notices, and a `/api/stt` proxy.
- Docs: `docs/operations.md`, `docs/adr/0016-local-speech-recognition.md`, ADR index.
