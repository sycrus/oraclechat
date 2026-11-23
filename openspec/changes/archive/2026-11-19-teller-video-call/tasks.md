## Tasks

### 1. Backend (TDD)
- [x] 1.1 Failing schema/definition tests: `call` optional, `call` without `voice` rejected, Mira has `call.voice = mira`, Sage has none; implement in `tellers/schema.ts` and `mira.yaml`.
- [x] 1.2 Failing speech client tests against a fake `fetch` (WAV passed through; refused, timeout, 5xx and 404 → `SpeechUnavailableError`; health); implement `src/speech/client.ts`.
- [x] 1.3 Failing route tests in `tests/server/tts.test.ts`: 400 empty / over 500 chars, 404 unknown teller and Sage, 503 with no speech client and with a failing one, 200 `audio/wav`, `GET /api/tts/health`, `oracle.tts` span attributes with no text; implement routes and wire `TTS_BASE_URL` in `server.ts`.

### 2. Speech sidecar (TDD)
- [x] 2.1 Create `services/tts/.venv` (CUDA 12.8 PyTorch, `omnivoice`, FastAPI, uvicorn, soundfile, pytest, httpx); gitignore the venv and voices.
- [x] 2.2 Failing pytest with a fake model: `/synthesize` returns WAV, unknown voice 404, bad voice name rejected, `/health`; implement `services/tts/app.py`.
- [x] 2.3 `make_voice.py`; generate the placeholder `voices/mira.wav` + `.txt`; add `pnpm tts`; smoke-test real synthesis and record latency and VRAM. Regression found by the owner: with `omnivoice 0.2.1` + `transformers 5.23` the output was noise (Whisper heard none of the text). Pinned `omnivoice==0.1.5` + `transformers==5.3.0` (ComfyUI's working versions) in `services/tts/requirements.txt`, switched to the README loading (`device_map`, `dtype`), regenerated the voice; Whisper now transcribes the sent sentences correctly.

### 3. Frontend (TDD)
- [x] 3.1 Failing Vitest tests for the call reducer (idle → speaking → idle, queue order, ended ignores events, audio failure returns to idle); implement `lib/call/state.ts`.
- [x] 3.2 Failing tests for `mouthOpen` (floor closes, clamp, smoothing) and idle helpers (blink delay 2–6 s, blink curve); implement `lib/call/mouth.ts` and `lib/call/idle.ts`.
- [x] 3.3 Add `three` and `@pixiv/three-vrm`; download a licence-checked sample VRM to `public/tellers/mira/mira.vrm` (gitignored); implement `app/call/vrm-stage.ts`.
- [x] 3.4 Failing component tests: 📹 shown only for a single-Mira chat; overlay view shows "voice offline", the subtitle, "model unavailable" and the end-call button (closing was verified live, as the frontend has no DOM test setup); implement `call-overlay.tsx`, the header button and the `/api/tts` proxies.

### 4. Verification and alignment
- [x] 4.1 Live demo (dev servers on 3001/4001): idle model with arms lowered, typed sentence spoken (state idle → speaking 3.8 s → idle, mouth open mid-sentence), sidecar stopped → "Voice offline" + subtitle, end call returns to chat. GIF `mira_video_call_m1.gif`. Synthesis 0.60–0.65 s warm, 1.35 s first request, 0.86 s through the proxy; sidecar about 4.8 GB of VRAM. The `oracle.tts` span was exported to the configured Langfuse/LangSmith exporters and its attributes are covered by tests; not inspected in a trace UI. Audio quality not judged (owner to listen).
- [x] 4.2 Update `.env.example` (`TTS_BASE_URL`, `OMNIVOICE_MODEL_PATH`) and `docs/operations.md` (installing and starting the sidecar, asset paths).
- [x] 4.3 Check ADR alignment against ADR-0015 and the reviewed ADRs; run `pnpm test`, `pnpm lint` (includes `pnpm adr:check`), the sidecar pytest and `graphify update .`.
