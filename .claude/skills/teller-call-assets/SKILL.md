---
name: teller-call-assets
description: Set up or replace a teller's video-call assets on this PC — download and check the VRM model, generate the OmniVoice voice clip, and prove the voice works with a TTS→Whisper round trip. Use when adding a callable teller, swapping a teller's 3D model or voice, or when a call shows a blank model, "Voice offline", or a wrong voice. Assets are local-only and gitignored.
---

# Teller call assets

Every callable teller needs two local files, both gitignored:
- `frontend/app/public/tellers/<name>/<name>.vrm`, the 3D model
- `services/tts/voices/<name>.wav` + `<name>.txt`, the voice clone reference

The teller's YAML must also have `call: voice: <name>`. A fresh clone has none of these files. `docs/operations.md` § "Video calls" is the owner-facing reference; keep it in step.

Scripts live beside this file. Run them from the repo root.

## 1. Model

1. Pick the model. The default source is [PolygonalMind/100Avatars](https://github.com/PolygonalMind/100Avatars). The raw URL pattern is `https://raw.githubusercontent.com/PolygonalMind/100Avatars/master/100Avatars_NNN/100Avatars_NNN_<Name>.vrm`. Low-poly versions have vowel mouth shapes and blink.
2. Download into a **new empty folder in the scratchpad**, never straight into `public/`:
   `curl -fL -o <scratch>/vrm/<name>.vrm <url>`
3. Check it:
   `node .claude/skills/teller-call-assets/check-vrm.mjs <scratch>/vrm/<name>.vrm`
   - FAIL with no glTF magic means the download was an HTML page or a Git LFS pointer. Fix the URL.
   - FAIL on missing bones means unusable: calls frame the camera from the head bone.
   - WARN with fewer than 5 vowels means lip sync falls back to loudness. Tell the owner before using it.
   - Note the embedded `license` line. The 100Avatars files say `CC0` inside, but the repository license is CC BY 4.0. `docs/asset-attribution.md` follows the repository, so keep attributing.
4. Copy it to `frontend/app/public/tellers/<name>/<name>.vrm`. If you're replacing an existing model, keep the old one beside it with a descriptive suffix (as `mira.rose-voxel.vrm` is). Never delete it silently.
5. Update `docs/asset-attribution.md` (creator, source repository, exact file, license, changes) and the models line in `docs/operations.md`.

## 2. Voice

1. The TTS venv must exist (one-time setup in `docs/operations.md`). From `services/tts`:
   `.venv/Scripts/python make_voice.py <name> --instruct "<gender>, <age>, <pitch>, <accent>" --text "<one in-character sentence>"`
   Examples from the existing tellers are in `docs/operations.md`. An in-character `--text` gives a better clone than the default sample.
2. The owner decides whether it sounds right. If not, re-run with `--seed <n>` or a different `--instruct`. Record the final command line in `docs/operations.md`.
3. The voice name must match `call.voice` in the teller's YAML and the pattern `^[a-z0-9-]+$`.

## 3. Prove it works (required before saying the voice works)

The backend (`:4000`) and the sidecar (`pnpm tts`, `:4100`) must be running, with `WHISPER_MODEL_PATH` set.

```
node .claude/skills/teller-call-assets/voice-roundtrip.mjs <teller-id> ["sentence"] [--keep <scratch>/sample.wav]
```

It sends the sentence through `/api/tts`, which is the same path a call uses, then transcribes the audio with the sidecar's Whisper. It passes at 85% or more of the words matching. Failures it explains:
- **404:** the teller has no `call.voice`, or the backend is an old build. After a YAML change, rebuild with the stack stopped (see `live-check`).
- **503:** the sidecar is down or `voices/<voice>.wav` is missing.

Also confirm two regressions: one existing teller still passes, and `voice-roundtrip.mjs nobody` returns 404.

## 4. See it

Use the `live-check` skill to open a 1:1 call and screenshot it. Look at the screenshot yourself. The face and shoulders should be in frame with the whole head visible. A blank stage usually means a `.next` folder was clobbered by a build, not a bad model.

## 5. Before finishing

`git status --short` must list no `.vrm`, `.vrma`, `.wav` or `services/tts/voices/` files (`.gitignore` covers them; check anyway).
