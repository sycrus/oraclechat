## Context

Tellers are text-only. The owner's PC (ADR-0010: RTX 5080, 16 GB, `qwen3.5:9b` using about 6.6 GB) already has k2-fsa OmniVoice weights from ComfyUI, and the `omnivoice` Python package exposes `OmniVoice.from_pretrained(path)` and `.generate(text=..., ref_audio=..., ref_text=..., instruct=...)`, returning 24 kHz audio. This change is milestone 1 (M1): typed sentences are spoken by a 3D Mira. Milestone 2 (language-model replies spoken one sentence at a time, with emotion tags) follows separately.

The frontend (`frontend/app`) is Next 14 + React 18 with no 3D library. It keeps a static teller list in `src/app/chat-workspace.tsx` and proxies every backend call through `src/app/api/**/route.ts` (pattern: `api/memory/consent/route.ts`). The backend (`backend/agent`) is Express (`src/server/app.ts`, `createApp(chatService)`), with zod teller definitions (`src/tellers/schema.ts`) loaded from YAML, and OpenTelemetry spans via `src/observability/otel.ts`.

## Decision

### Data flow

```
Overlay (browser) ──POST /api/tts {tellerId, text}──▶ Next proxy ──▶ backend POST /api/tts
                                                                       │ span oracle.tts
                                                                       │ registry: teller.call.voice
                                                                       ▼
                                                     sidecar POST /synthesize {text, voice}
                                                     (services/tts, 127.0.0.1:4100, OmniVoice on GPU)
                                                                       │ audio/wav
Overlay ◀── WAV ── decode → AnalyserNode → speakers; RMS each frame → mouth
```

### Speech sidecar — new (`services/tts/`)

- `app.py`: FastAPI. Loads OmniVoice once at startup from `OMNIVOICE_MODEL_PATH` (the existing ComfyUI weights, read-only). `GET /health` returns `{ ready }`. `POST /synthesize {text, voice}` loads `voices/<voice>.wav` and its transcript `voices/<voice>.txt`, calls `generate` in a worker thread (one at a time, behind a lock), and returns `audio/wav`. Unknown voice → 404; model not ready → 503.
- Voices are named, not given as paths: the backend sends `voice: "mira"`, and the sidecar resolves it inside its own `voices/` folder (names restricted to `[a-z0-9-]`). No file path crosses the API.
- `make_voice.py`: one-off script that designs a voice from an `instruct` description plus a sample line, and saves `voices/<name>.wav` + `.txt`. The owner reruns it until they like the voice.
- Own virtual environment at `services/tts/.venv` (CUDA 12.8 PyTorch for the 5080, `omnivoice`, `fastapi`, `uvicorn`, `soundfile`). Root script `pnpm tts` starts uvicorn on `127.0.0.1:4100`.
- Gitignored: `.venv/`, `voices/*.wav`, `voices/*.txt`.

### Backend — reused and new

- **Reused:** `tellers/schema.ts` gains an optional `call: { voice: kebab-case string }`, and `mira.yaml` gets `call: { voice: mira }`. The registry is unchanged.
- **New** `src/speech/client.ts`: `createSpeechClient({ baseUrl, fetch })` with `synthesize(text, voice)` returning a WAV buffer or throwing `SpeechUnavailableError` (connection refused, timeout of 30 s, 5xx, missing voice) and `health()`.
- **New** routes in `src/server/app.ts` (an optional second `createApp` argument `{ speech, tellers }`):
  - `POST /api/tts {tellerId, text}`: 400 for empty or over 500 characters; 404 for an unknown teller or one without `call`; 503 `{ error: "voice offline" }` when no `TTS_BASE_URL` is set or the client throws; otherwise `200 audio/wav`.
  - `GET /api/tts/health` → `{ available }`.
- Span `oracle.tts` with `oracle.teller.id`, `oracle.tts.chars`, `oracle.tts.outcome` (`ok | offline | rejected`) and its duration. The text, audio and paths are never added.
- `server.ts` reads `TTS_BASE_URL` (empty means voice offline). No fallback voice and no hosted path, even when ADR-0014's hosted variables are set.

### Frontend — new

- Dependencies: `three`, `@pixiv/three-vrm` (VRM 0.x and 1.0, expressions, spring bones, MToon).
- `src/lib/call/state.ts`: pure reducer for the call state machine. State `{ body: "idle" | "speaking" | "ended", expression: "neutral", queue: string[], current?: string }`. Events: `say(text)`, `audioStarted`, `audioEnded`, `audioFailed`, `end`. `say` while speaking appends to the queue; `audioEnded` pops the next item. After `end`, everything is ignored. The expression layer is a separate field so M2 can set it without touching body states.
- `src/lib/call/mouth.ts`: `mouthOpen(rms, previous)` → 0..1, with a noise floor (silence closes the mouth), gain, a clamp, and quick-open/slow-close smoothing.
- `src/lib/call/idle.ts`: `breathing(t)` gives small chest and neck rotations; `nextBlinkDelay(random)` is 2–6 s; `blinkWeight(sinceBlinkStart)` follows a ~150 ms close-open curve.
- `src/app/call/vrm-stage.ts`: imperative Three.js scene: load the VRM with `GLTFLoader` + `VRMLoaderPlugin`; rotate the upper arms about 70° down; place the camera at head height for a head-and-shoulders shot. Each frame it applies breathing, blinks, the mouth (`expressionManager.setValue("aa", value)`) and `vrm.update(dt)`. If loading fails it reports an error.
- `src/app/call/call-overlay.tsx`: a client component holding the reducer. It mounts the stage (dynamic import, no SSR), checks `/api/tts/health` on open, takes typed input, fetches WAV for the current sentence, plays it through `AudioContext` → `AnalyserNode` → destination, and shows subtitles, the "voice offline" and "model unavailable" notices, and the end-call button.
- `chat-workspace.tsx`: the static teller list gains `model?: "/tellers/mira/mira.vrm"`. The header shows 📹 when the active conversation has exactly one teller and that teller has a `model`.
- Proxies: `src/app/api/tts/route.ts` and `src/app/api/tts/health/route.ts` (copy of the consent proxy pattern; binary body passed through).
- Gitignored: `frontend/app/public/tellers/**/*.vrm`. Stand-in model: a sample VRM from pixiv's three-vrm repository; licence checked before use.

### Why these choices

- **Three.js over Babylon:** the maintained Babylon VRM loaders only read VRM 0.x and target Babylon 5. `@pixiv/three-vrm` is maintained by VRoid's publisher. The state machine is plain TypeScript, so the renderer only executes it and can be swapped.
- **A sidecar instead of ComfyUI:** this avoids loading ComfyUI and its workflow JSON for a single model; the sidecar holds only OmniVoice (a few GB of VRAM).
- **Volume lip sync:** OmniVoice gives no phoneme timings, and volume needs no extra model. wLipSync vowel shapes come later.
- **Named voices:** the voice name keeps paths on the sidecar's side and out of spans and API bodies.

### Test-first order

1. Backend: schema tests (`call` optional; missing `voice` rejected; Mira has it, Sage doesn't); speech client tests against a fake `fetch` (WAV through, refused → `SpeechUnavailableError`); `app.test.ts` route tests (400, 404 for Sage, 503 with no URL and with a failing client, 200 WAV, span attributes without text, hosted config doesn't change the target).
2. Frontend (Vitest): reducer transitions and queue; `mouthOpen` floor, clamp and smoothing; idle blink delays within 2–6 s; header shows 📹 only for single-Mira chats; overlay shows "voice offline" and a subtitle when the TTS call returns 503 (fetch and audio stubbed).
3. Sidecar (pytest): `/synthesize` with a fake model returns a WAV header; unknown voice 404; voice name with `..` rejected; `/health`.
4. Live demo by hand: first audio within about 1.5 s for a short sentence, measured and reported.

## Verification

- `pnpm test`, `pnpm lint`, the sidecar's `pytest`.
- Live: with `pnpm tts` running, open Mira's chat, click 📹, see the idle model, type "Hello, I'm Mira" and hear it with the mouth moving; see the `oracle.tts` span in the console exporter. Stop the sidecar and repeat to see "voice offline" and the subtitle. Recorded as a GIF via Claude in Chrome. Audio quality is judged by the owner.

## Risks

- **VRAM:** OmniVoice + `qwen3.5:9b` on 16 GB. Measured with `nvidia-smi` during the demo; if it doesn't fit, fall back to Kokoro as a separate decision.
- **Latency:** if a short sentence takes over 1.5 s to start, report it rather than switch engines silently.
- **PyTorch on Blackwell:** the CUDA 12.8 wheels are required; a wrong wheel fails at startup with a clear error.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0004, ADR-0007, ADR-0010, ADR-0013, ADR-0014

- **ADR-0002 (local-first):** speech is synthesized only by the local sidecar; no hosted speech exists.
- **ADR-0014 (hosted replies):** unaffected. Hosted replies cover teller text only; speech stays local even when they are on. There is no fallback in either direction, matching its no-fallback rule.
- **ADR-0004 (OpenTelemetry):** `oracle.tts` spans carry only metadata, no content, consistent with existing reply spans.
- **ADR-0010 (production profile):** the sidecar is a new local service on `127.0.0.1` only. It is started by hand in M1 and is not yet under `oracle-up.ps1`; calls degrade to "voice offline" when it is down. Adding it to the supervisor is deferred and recorded in ADR-0015.
- **ADR-0007 (single-user):** no auth or multi-user concerns; the endpoints are local like the rest.
- **ADR-0013, ADR-0001:** unchanged; calls are a new way to present a teller, not a new discipline.
- **New ADR-0015 (Proposed):** local voice calls — the OmniVoice sidecar, backend-mediated traced speech, the Three.js/VRM renderer with an app-owned state machine, and model and voice assets kept out of git.
