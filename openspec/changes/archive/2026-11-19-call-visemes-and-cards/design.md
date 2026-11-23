## Context

M1 and M2 (archived `2026-11-19-teller-video-call`, `2026-11-19-teller-call-conversation`; ADR-0015) give the call overlay a VRM stage (`frontend/app/src/app/call/vrm-stage.ts`), an app-owned call state machine (`lib/call/state.ts`), loudness lip sync (`lib/call/mouth.ts`: RMS from an `AnalyserNode` → the `aa` weight), and call turns that stream `message_start` (with `reading` and `card`) and `sentence` events into `call-overlay.tsx`. A reading in a call currently sets the note "Mira drew N cards — see chat" (`readingNote`). The chat already renders tarot art (`app/tarot-artwork.tsx`), validates reading data (`lib/tarot.ts`: `parseTarotSpread`, `parseSignatureCard`) and labels positions (`message-body.tsx`: `positionLabel`, signature labels).

wLipSync 1.3.1 (npm `wlipsync`, MIT, 55 kB, WASM and worklet inlined in its main entry) exposes `createWLipSyncNode(audioContext, profile)`. The node takes audio input and produces no output. It exposes `weights` (`A I U E O S`, 0–1, already smoothed) and `volume` (0–1 between `minVolume` and `maxVolume`, in log10 RMS, defaults −2.5 and −1.5). It needs an AudioWorklet, so it only runs in a secure context (`localhost` or https). A profile is required; the repository's `example/profile.json` (MIT, 12 MFCC samples) is the only ready-made one.

## Decision

### Lip sync — reused and new

- **Reused:** `mouth.ts` (`mouthOpen`, `rms`) stays as the fallback path; the analyser still feeds it.
- **`lib/call/visemes.ts`** (new, pure): `VISEMES = ["aa","ih","ou","ee","oh"]`; `visemeWeights(weights, volume)` maps `A→aa, I→ih, U→ou, E→ee, O→oh`, multiplies by `volume`, clamps to 0–1, ignores `S` and unknown keys, and returns all five (zeros when volume is 0). There is no extra smoothing, because the node already smooths.
- **Profile:** `public/lipsync/profile.json`, copied from wLipSync `example/profile.json`, with source and licence in `public/lipsync/README.md` and `docs/operations.md`.
- **`call-overlay.tsx`:** after creating the `AudioContext` (inside the click), it lazily creates one lip sync node per context. It fetches the profile and calls `createWLipSyncNode` through a dynamic `import("wlipsync")`, so it stays out of the server bundle. On failure it logs once and keeps `null`. For each sentence: `source → analyser → destination` as now, and also `source → lipSyncNode` when there is a node.
- **`vrm-stage.ts`:** `setAnalyser(analyser)` becomes `setAudio({ analyser, lipSync })`. Each frame, if `lipSync` is set it applies `visemeWeights(lipSync.weights, lipSync.volume)` to the five expressions. Otherwise it uses `mouthOpen` on `aa` and eases the other four toward 0 with `easeToward`. Clearing the audio closes all five the same way.
- **Tuning:** `minVolume` and `maxVolume` start at the defaults and are tuned live against OmniVoice output (screenshots plus a frame log of the weights).

### Cards in the call — reused and new

- **Reused:** `parseTarotSpread`, `parseSignatureCard`, `TarotArtwork`, `positionLabel` and the signature labels (exported from `message-body.tsx`).
- **`lib/call/reading.ts`** (new, pure): `readingDisplay(name, reading, card)` returns `{ cards: { spread, signature? } }` for a valid tarot spread, otherwise `{ note }` using the existing note text. It replaces `readingNote` in `call-overlay.tsx`.
- **`call-overlay.tsx`:** on `message_start` with a reading, it applies `readingDisplay`. Cards set `cards` and clear the note; a note clears `cards`. `cards` persists across turns and is replaced only by the next reading. It is not cleared on `think`.
- **`call-overlay-view.tsx`:** new optional prop `cards?: { spread: TarotSpread; signature?: SignatureCard }`. It renders `<section className="call-cards" aria-label="Cards Mira drew">`, a vertical list on the right of the stage that does not cover the face, with one `figure` per card: art (reversed when needed), name, position label and orientation, plus the signature card labelled "Action card" or "Shadow card". A Celtic Cross scrolls inside the tray. At narrow widths the tray moves under the top line as a horizontal strip.

### Test-first order

1. `visemes.test.ts`: maps each vowel; scales by volume; zero volume gives all zeros; `S` and unknown keys are ignored; clamps above 1.
2. `reading.test.ts`: valid spread, spread plus signature, invalid data, an I Ching casting.
3. `call-overlay.test.tsx` (view): the tray shows names, positions and orientations for a three-card spread; the signature card is labelled; no tray and the note when `cards` is absent.
4. Stage wiring (`vrm-stage.ts`, audio graph) is verified live, since jsdom has no WebGL or AudioWorklet.

## Verification

`pnpm test`, `pnpm lint`; a live call on the dev servers with a GIF. Screenshots show at least three different mouth shapes during one sentence and a closed mouth at the end. A three-card reading appears in the tray and is replaced by a later one-card reading. The fallback is checked by forcing the profile URL to 404: the mouth still moves.

## Risks

- **Sample profile vs Mira's voice:** the sample was calibrated on another voice, so vowel detection may be biased (for example mostly `aa`). It is still better than open/close; measured live and reported. A custom profile is a follow-up.
- **Production over LAN http:** no AudioWorklet, so it falls back to loudness. Documented.
- **Bundle:** wLipSync is loaded only when a call starts.

## ADR alignment

ADRs reviewed: ADR-0002, ADR-0013, ADR-0015

- **ADR-0015:** rendering stays in the Three.js/three-vrm stage; the state machine is unchanged; speech stays on the local sidecar. Lip sync analysis runs locally in the browser on audio that is already local. No new decision is needed.
- **ADR-0002:** no hosted service; the WASM and profile are bundled.
- **ADR-0013:** the tray shows the teller's own discipline (tarot for Mira); other disciplines keep the note.
