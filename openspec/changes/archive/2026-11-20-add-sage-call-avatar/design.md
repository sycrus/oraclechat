# Design

## Reuse vs. new

Everything is reused; nothing new is built. The call pipeline became teller-agnostic when ddef022 moved framing to measured-head extents and VRM 0.x posing, and `backend/agent/src/speech/routes.ts:45` already resolves `call.voice` for any teller via `TellerRegistry`. This change is assets plus configuration, verified by tests.

## Changes by file

1. **Asset (untracked, gitignored):** download `100Avatars_009/100Avatars_009_CactusBoy.vrm` from the 100Avatars `master` branch to `frontend/app/public/tellers/sage/sage.vrm`. Already verified loadable under three-vrm 3.5.5 in a prior headless check; VRM 0.x; binds `aa/ih/ou/ee/oh` + blink, which is all the lip-sync and idle paths require.
2. **Frontend teller list:** the static array in `chat-workspace.tsx:39-42` moves to a new `frontend/app/src/lib/tellers.ts` (following the existing lib pattern of domain module + colocated test), with `model: "/tellers/sage/sage.vrm"` added to Sage's entry. The extraction makes the list testable — no test imports the chat-workspace component today. `callableTeller` (`frontend/app/src/lib/call/tellers.ts`) then gates the 📹 button on, and `CallOverlay` receives the model path it already handles for Mira (missing file → "model unavailable" notice per the existing spec).
3. **`backend/agent/src/tellers/definitions/sage.yaml`:** add
   ```yaml
   call:
     voice: sage
   ```
   No schema change: `call` is already in `tellerDefinitionSchema` (Mira uses it).
4. **Asset (untracked, gitignored):** generate `services/tts/voices/sage.wav` + `sage.txt` with `.venv/Scripts/python make_voice.py sage --instruct "..."` (calm, androgynous, medium pitch — rerun with `--seed`/`--instruct` until it sounds right, exactly as documented for Mira). OmniVoice loads once and caches one clone prompt per file, so VRAM cost is unchanged.
5. **`docs/operations.md`:** extend the video-call section with Sage's paths (`sage.vrm`, `make_voice.py sage`) alongside Mira's.

## TDD approach

Write the failing tests first:

- New `frontend/app/src/lib/tellers.test.ts` — asserts the extracted chat teller list gives both Mira and Sage a model path. Fails before `lib/tellers.ts` exists; passes after task 2.1. The `call-overlay.test.tsx` fixture update (Sage gains a model, `callableTeller` now offers him, group chats stay rejected) mirrors the delta scenarios and stays green — it tests `callableTeller`'s logic, which is unchanged.
- `backend/agent/tests/tellers/definitions.test.ts:77` — "Mira can be called … and Sage cannot" flips to expect `sage.call` to equal `{ voice: "sage" }`. Fails before the yaml change.
- `backend/agent/tests/server/tts.test.ts:96` — uses `sage-the-seer` as the "teller without calls" fixture and loads the real definitions directory, so it breaks once the yaml gains `call`; the test is updated in the same red step: the rejection case uses a minimal inline teller registered without `call`, and a new case asserts Sage synthesizes with voice `sage`. The new case fails (404) before the yaml change.

Then implement 2–3 (minimum change), rerun the focused tests, then `pnpm test` and `pnpm lint`.

## Risks

- **Cactus Boy framing:** ddef022 frames from the measured head extent, but only live eyes-on confirmation proves Cactus Boy's big head sits right. Acceptance includes a live call check, like Mira's had.
- **Voice quality:** cloned-voice quality is subjective; `make_voice.py` is rerunnable until the owner is satisfied. Out of test scope.

## ADR alignment

ADRs reviewed: ADR-0015, ADR-0016, ADR-0013, ADR-0010, ADR-0002

- **ADR-0015 (local voice calls):** complies fully — speech stays local through the existing sidecar, the voice is a named clone prompt in `voices/`, and both new assets stay out of git with paths documented in `docs/operations.md`, as the ADR requires.
- **ADR-0016 (local speech recognition):** unaffected — recognition is per-call, not per-teller; nothing changes in the STT path.
- **ADR-0013 (one discipline per teller):** Sage remains I Ching-only. The call adds no tarot ability; existing call-turn rules already show non-renderable readings as a "see chat" note, which covers his hexagrams.
- **ADR-0010 (owner's PC production profile):** the new assets are documented local setup on the owner's machine, like Mira's.
- **ADR-0002 (local-first):** voice synthesis and recognition remain on-PC.

No durable architecture decision changes, so no new ADR is proposed.
