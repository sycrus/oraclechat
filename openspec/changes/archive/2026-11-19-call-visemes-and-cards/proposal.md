## Intent

Make Mira look like she is really talking on a call: her mouth forms vowel shapes instead of only opening and closing, and the cards she draws appear in the call instead of "see chat".

ADRs reviewed: ADR-0002, ADR-0013, ADR-0015

## Why

M2 made calls a real conversation, but two things break the illusion. The mouth only follows loudness (the `aa` shape, open or closed), which reads as a puppet. A reading in a call shows only a note pointing to the chat, so the owner has to end the call or look away to see what Mira is interpreting aloud.

## What Changes

- **Vowel lip sync.** The playing speech is analysed in the browser with wLipSync (MIT, a WebAudio/WASM port of uLipSync). Its vowel weights (A, I, U, E, O) drive the VRM `aa`, `ih`, `ou`, `ee` and `oh` shapes, scaled by loudness and smoothed. Silence closes the mouth.
- **Profile.** The MIT sample profile from the wLipSync repository is bundled under `public/`, with its provenance recorded. Calibrating a profile for Mira's voice is left for later.
- **Fallback.** If the lip sync analyser can't start (no AudioWorklet outside a secure context, profile missing, WASM error), the call falls back to the M1 loudness mouth.
- **Cards in the call.** When Mira draws a tarot reading in a call turn, the overlay shows the drawn cards in a tray beside her: art, name, position and orientation, plus her signature card if she drew one. The tray stays until the next reading or the end of the call. The reading is still saved to the chat.
- **Other readings.** A reading the overlay can't show (an I Ching casting, or invalid card data) keeps the M2 "see chat" note.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `voice-calls`: mouth shapes follow the vowels being spoken, with a loudness fallback; tarot readings drawn in a call are shown in the overlay.

## Non-goals

- Calibrating a lip sync profile for Mira's voice in Unity or with a custom tool.
- Phoneme timings from the TTS sidecar, or text-driven visemes.
- Animating card draws (flips, deals), or tapping a card for its meaning in the call.
- I Ching castings in the call overlay (calls are Mira-only today).
- Changing the backend, the stream events or what is saved.

## Impact

- Frontend only: new dependency `wlipsync`; `public/lipsync/profile.json`; a pure `lib/call/visemes.ts`; `vrm-stage.ts` reads vowel weights; `call-overlay.tsx` builds the audio graph and the card tray; `call-overlay-view.tsx` renders the tray; CSS.
- Docs: `docs/operations.md` (profile provenance and fallback).
