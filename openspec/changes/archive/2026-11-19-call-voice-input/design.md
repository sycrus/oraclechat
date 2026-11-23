## Context

M1–M3 (archived `2026-11-19-teller-video-call`, `-teller-call-conversation`, `-call-visemes-and-cards`; ADR-0015) give the call a VRM stage, a call state machine (`frontend/app/src/lib/call/state.ts`), streamed spoken sentences, and the card tray. Typed call messages go through `talk()` in `call-overlay.tsx` → `POST /api/conversations/:id/messages` with `call: true`. Speech output goes browser → Next proxy (`app/api/tts/route.ts`) → backend `registerSpeechRoutes` (`backend/agent/src/speech/routes.ts`, `SpeechClient` in `client.ts`) → the FastAPI sidecar `services/tts/app.py` (`create_app(voices_dir, load_engine)`, a GPU lock, `/health` → `{ready}`).

The PC has Whisper large-v3-turbo as a full Hugging Face folder at `ComfyUI/models/audio_encoders/openai_whisper-large-v3-turbo`. The sidecar pins `transformers==5.3.0` with torch 2.8 (CUDA 12.8), which can run it through `pipeline("automatic-speech-recognition")`.

## Decision

### Sidecar (`services/tts/app.py`) — reused and new

- **Reused:** app factory, lifespan loading, GPU lock, pinned stack.
- **`Transcriber` protocol** with `transcribe(audio: np.ndarray, sample_rate: int) -> str`, and `WhisperEngine`, which loads `WHISPER_MODEL_PATH` with the transformers ASR pipeline (fp16, `cuda:0`), `language="english"`, `task="transcribe"`, and returns stripped text. `create_app(..., load_transcriber=...)` loads it in the lifespan beside OmniVoice; a failure or a missing `WHISPER_MODEL_PATH` leaves it unset (logged).
- **`POST /transcribe`**: raw `audio/wav` body, at most 30 s and 2 MB. It is decoded with `soundfile`, mixed to mono and resampled to 16 kHz if needed (linear interpolation with numpy), then run under the same GPU lock as synthesis. Returns `{text}`. 400 for undecodable or empty audio or more than 30 s; 503 when no transcriber is loaded. Text that is only punctuation or whitespace becomes `""`.
- **`GET /health`** → `{ready, transcribe}`.

### Backend — reused and new

- **`SpeechClient.transcribe(wav: Uint8Array): Promise<string>`** posts to `/transcribe`; failures throw `SpeechUnavailableError`. `health()` stays a boolean for voice; a new `transcribeReady()` reads the `transcribe` field.
- **`POST /api/stt`** in `registerSpeechRoutes`, with `express.raw({ type: "audio/wav", limit: "2mb" })`. It checks for a `RIFF…WAVE` header and a duration ≤ 30 s from the header (`byteRate`), otherwise 400. With no client → 503. Otherwise `{ text }`. Span `oracle.stt`: `oracle.stt.outcome` (`ok` / `offline` / `rejected`), `oracle.stt.audio_ms`, `oracle.stt.chars`. No text and no audio.
- **`GET /api/tts/health`** → `{ available, stt }`.

### Frontend — reused and new

- **`public/call/mic-processor.js`** (AudioWorklet): posts 20 ms Float32 frames from the mic input to the main thread. It has no output.
- **`lib/call/vad.ts`** (new, pure): `createTurnDetector({ sampleRate })` with `push(frame) → TurnEvent[]`, where events are `speechStart`, `turn(samples)` and `discard`. It uses frame RMS against an adaptive noise floor (a slow moving average of quiet frames). Speech is a frame above `max(floor × 3, 0.008)`. A turn starts after 0.3 s of speech within 0.4 s, keeps 0.3 s of pre-roll, ends after 0.8 s below the threshold, and is cut at 20 s. Bursts under 0.3 s are discarded.
- **`lib/call/wav.ts`** (new, pure): `downsample(samples, from, 16000)` (block average) and `encodeWav(samples, 16000)` → 16-bit PCM mono.
- **`lib/call/state.ts`**: new event `interrupt` → body `idle`, expression neutral, current and queue cleared, and `dropTurn: true` so later `say` events from the interrupted stream are ignored until `turnEnded`. `turnEnded` clears `dropTurn`.
- **`call-overlay.tsx`**:
  - On mount, `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })` → a `MediaStreamSource` in the call's `AudioContext` (created on mount; the call button click counts as the user gesture) → the worklet → the detector. On end: stop the tracks and disconnect.
  - Mute sets `track.enabled = false` and resets the detector.
  - `speechStart` while thinking or speaking → stop the playing source, `dispatch({ type: "interrupt" })`.
  - `turn` → `encodeWav` → `POST /api/stt` → if the text is non-empty, set it as the owner's caption and call `talk(text)`. If a turn is in flight, the text waits in `pendingTalk` and is sent in the `finally` of the current turn.
  - The voice notice and the existing typed path are unchanged.
- **`call-overlay-view.tsx`**: a mic button (`aria-pressed`, labels "Mute microphone" / "Unmute microphone"; disabled when unavailable), a hearing indicator while the owner speaks, notices "Microphone unavailable — type instead" and "Can't hear you right now — type instead", and an `ownerCaption` shown in place of "…" while thinking ("You: …").
- **`app/api/stt/route.ts`**: forwards the raw body to `${backend}/api/stt`; failure → 503.

### Detector choice

An energy detector is simple, testable, and has no model to load; Chrome's echo cancellation removes most of Mira's own voice. The risk is her residual echo or room noise triggering an interrupt. The 0.3 s minimum and the adaptive floor limit that, and an empty transcript sends nothing. The live check measures false interrupts. If they are a problem, a learned detector (Silero via onnxruntime-web) is a follow-up change.

### Test-first order

1. Sidecar pytest with a fake transcriber: text returned; resampled 48 kHz stereo input is accepted; 400 for garbage, empty and > 30 s; 503 without a transcriber; health fields; punctuation-only → `""`.
2. Backend: client `transcribe` and `transcribeReady`; route 400 (not WAV, empty, > 30 s), 503 offline, 200 `{text}`; span attributes have no text; health has `stt`.
3. Frontend: `wav.test.ts` (header fields, length, clipping, downsample length and average); `vad.test.ts` (silence → nothing; a 0.1 s click → discard; 1 s of speech then 0.8 s of silence → one turn with pre-roll; 20 s cut; adaptive floor ignores steady noise); `state.test.ts` (`interrupt` clears speech and drops later `say` until `turnEnded`); view tests (mic button states, both notices, owner caption).
4. Live: see Verification.

## Verification

`pnpm test`, `pnpm lint`, the sidecar pytest, `graphify update .`. Live, on the dev servers with a throwaway conversation: `getUserMedia` is replaced in the page by a stream playing a recorded question (Mira's TTS voice saying an owner line), checking transcription → send → spoken reply. Barge-in is checked by playing a second clip while she speaks. A Whisper round trip confirms accuracy. Real-microphone echo behaviour on speakers needs the owner and is reported as a manual check.

## Risks

- **Echo:** Chrome's echo cancellation may not fully remove WebAudio playback on every device, causing false interrupts. Headphones avoid it; measured and reported.
- **VRAM:** Whisper turbo fp16 needs about 1.6 GB beside OmniVoice (about 4.8 GB) and the chat model (about 6.6 GB) on 16 GB. Measured.
- **Latency:** 0.8 s pause + transcription (about 0.3–0.6 s for a short turn) + the reply's first sentence. Measured and reported.
- **Whisper hallucination on noise:** Whisper can transcribe noise as text such as "Thank you." The detector filters most noise first; the live check records any cases.

## ADR alignment

ADRs reviewed: ADR-0002, ADR-0004, ADR-0009, ADR-0010, ADR-0014, ADR-0015

- **ADR-0016 (new, Proposed → Accepted at archive):** owner speech is recognised only by the local sidecar through the backend; audio is never stored, logged or traced; no hosted STT. It is new because ADR-0015 covers speech output only.
- **ADR-0015:** the backend still owns speech; the sidecar stays on `127.0.0.1`; the state machine stays app-owned (the new `interrupt` event).
- **ADR-0002 / ADR-0014:** recognition is local even with hosted replies on; a transcript is just a call message, so it reaches a hosted reply provider exactly as typed text does.
- **ADR-0004:** the `oracle.stt` span has durations and counts only.
- **ADR-0009:** spoken messages go through the normal memory path, like typed ones.
- **ADR-0010:** the sidecar is still started by hand; supervising it remains a follow-up.
