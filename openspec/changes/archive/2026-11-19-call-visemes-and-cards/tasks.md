## Tasks

### 1. Lip sync (TDD)
- [x] 1.1 Failing `lib/call/visemes.test.ts` (each vowel, volume scaling, silence, `S`/unknown ignored, clamp); implement `lib/call/visemes.ts`.
- [x] 1.2 Add `wlipsync` with pnpm; bundle `public/lipsync/profile.json` from the wLipSync example with a provenance README.
- [x] 1.3 `call-overlay.tsx`: create the lip sync node lazily per `AudioContext` with a logged fallback to `null`, and connect each sentence source to it. `vrm-stage.ts`: `setAudio({ analyser, lipSync })` drives the five vowel shapes, with loudness fallback and close on silence.

### 2. Cards in the call (TDD)
- [x] 2.1 Failing `lib/call/reading.test.ts` for `readingDisplay` (spread, spread plus signature, invalid data, I Ching); implement `lib/call/reading.ts`, replacing `readingNote`.
- [x] 2.2 Failing view tests for the card tray (names, positions, orientations, signature label, absent → note only); implement the tray in `call-overlay-view.tsx` and CSS; wire `cards` state in `call-overlay.tsx` (replaced by the next reading, kept across turns).

### 3. Verification and alignment
- [x] 3.1 Live call on the dev servers (throwaway conversation, deleted afterwards): screenshots of three or more mouth shapes in one sentence and a closed mouth after; tune `minVolume`/`maxVolume`; a three-card reading in the tray replaced by a later one-card reading; profile 404 → loudness fallback still moves the mouth. GIF `mira_call_visemes_cards.gif`. Result: a frame log over one sentence ("Oh, I see. We all need a little more sleep, too.") had `aa` (0.78, with `ou` 0.19) and `ih` (0.51, with `ou` 0.23 and `ee` 0.12) as the dominant shapes and all five at 0 afterwards; `oh` was never dominant, which is the sample profile's bias. The default volume bounds gave a natural opening, so they were left unchanged. With the profile at 404, the warning was logged, `aa` followed loudness (peak 0.48) and the other shapes stayed at 0. A three-card reading plus the signature card filled the tray (reversed card upside down; four cards scroll at a 767 px window); the next one-card reading replaced it with Guidance plus "Action card". The saved messages held both readings and no tags. Rendering was throttled to about 1.5 fps because the Chrome window was not in front, so early screenshots looked blank; not a code issue. `next build` passes despite webpack's top-level-await warning for `wlipsync`.
- [x] 3.2 Update `docs/operations.md` (profile provenance, secure-context fallback). Check ADR alignment; run `pnpm test`, `pnpm lint` (includes `pnpm adr:check`) and `graphify update .`.
