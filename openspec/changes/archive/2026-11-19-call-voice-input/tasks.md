## Tasks

### 1. Sidecar (TDD)
- [x] 1.1 Failing pytest for `/transcribe` and `/health` with a fake transcriber (text, resampling of 48 kHz stereo, 400 for garbage/empty/over 30 s, 503 without a transcriber, punctuation-only → empty); implement `WhisperEngine`, `load_transcriber` and the route in `services/tts/app.py`.
- [x] 1.2 Live check of `WhisperEngine` on the real weights: a TTS clip round-trips, plus load time and VRAM. Result: a 4.3 s Mira TTS clip came back as "Should I start writing my novel this week or wait until next month?" (only a comma missing) in 0.12 s warm; load 3.6 s; peak 1.84 GB VRAM.

### 2. Backend (TDD)
- [x] 2.1 Failing client tests (`transcribe`, `transcribeReady`); implement them in `src/speech/client.ts`.
- [x] 2.2 Failing route tests (`POST /api/stt` 400/503/200, span attributes without text, health `stt`); implement them in `src/speech/routes.ts`.

### 3. Frontend (TDD)
- [x] 3.1 Failing `wav.test.ts`; implement `lib/call/wav.ts`.
- [x] 3.2 Failing `vad.test.ts`; implement `lib/call/vad.ts`.
- [x] 3.3 Failing reducer tests for `interrupt` and dropped sentences; update `lib/call/state.ts`.
- [x] 3.4 Failing view tests (mic button, notices, owner caption); update `call-overlay-view.tsx` and CSS.
- [x] 3.5 Mic worklet `public/call/mic-processor.js`, `app/api/stt/route.ts`, and wiring in `call-overlay.tsx` (capture, mute, interrupt, transcribe, pending send, release on end). Found live: under React strict mode, `AudioContext.close()` resolves late, so the remount reused a closing context (no worklets). The context is now forgotten at cleanup.

### 4. Verification and alignment
- [x] 4.1 Live call with an injected mic stream (throwaway conversation, deleted afterwards): spoken question → transcript → spoken reply; barge-in during her reply stops her, her full reply is saved, and the new message follows; recognition offline → notice; mute → nothing sent. Record latency, VRAM and any false interrupts. GIF `mira_call_voice_input.gif`. Result: `getUserMedia` was replaced by a stream playing Mira-voice clips of owner lines. Speech was detected 0.45 s in; the transcript was exact ("Okay, what should I write about first, the hero or the world?"); `/api/stt` took 0.13–0.25 s; her first word came 2.7 s after the owner stopped (warm; the first turn after restarting the services took 11.4 s, a cold model). A clip played 0.8 s into her reply stopped her within 0.47 s; the follow-up was sent and both of its sentences were spoken. All four turns and full replies were saved. Muted → no `/api/stt` request; a 503 from `/api/stt` → "Can't hear you right now — type instead" and nothing sent; ending the call ended the mic track. VRAM 15.6 of 16.3 GB with the chat model, OmniVoice and Whisper loaded. Found and fixed: an interrupt after her stream had finished left `dropTurn` set, so the next reply was silent (regression test added; `interrupt` now carries `streaming`). Not covered: real-microphone echo on speakers (no false interrupts can occur with an injected stream). Needs a manual check by the owner.
- [x] 4.2 Mark ADR-0016 Accepted at archive; update `docs/operations.md` (`WHISPER_MODEL_PATH`, mic and echo notes). Check ADR alignment; run `pnpm test`, `pnpm lint` (includes `pnpm adr:check`), the sidecar pytest and `graphify update .`.
