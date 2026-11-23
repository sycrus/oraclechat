# Tasks

## 1. Failing tests first

- [x] 1.1 Frontend: write `frontend/app/src/lib/tellers.test.ts` asserting the chat teller list gives both tellers a model path (Mira `/tellers/mira/mira.vrm`, Sage `/tellers/sage/sage.vrm`). Run it: it must fail (module does not exist yet).
- [x] 1.2 Backend: in `backend/agent/tests/tellers/definitions.test.ts`, change the "Teller call configuration" test to expect `sage.call` to equal `{ voice: "sage" }` (rename the test accordingly). Run it: it must fail.
- [x] 1.3 Backend: in `backend/agent/tests/server/tts.test.ts`, (a) replace the `sage-the-seer` fixture in the "rejects a teller without calls" case with a minimal teller registered inline that has no `call` section, and (b) add a case that requesting speech for `sage-the-seer` synthesizes with voice `sage`. Run the file: the new Sage case must fail (404 today), the rejection case must pass.

## 2. Minimum implementation

- [x] 2.1 Create `frontend/app/src/lib/tellers.ts` exporting the chat teller list with Sage's `model: "/tellers/sage/sage.vrm"` added, and make `chat-workspace.tsx` import it instead of its local array. Also give the Sage fixture in `call-overlay.test.tsx` the model and expect `callableTeller` to offer Sage (group chats stay undefined). Rerun the 1.1 test: pass.
- [x] 2.2 Add the `call: voice: sage` section to `backend/agent/src/tellers/definitions/sage.yaml`. Rerun 1.2 and 1.3: pass.

## 3. Assets on this PC (gitignored)

- [x] 3.1 Download `https://raw.githubusercontent.com/PolygonalMind/100Avatars/master/100Avatars_009/100Avatars_009_CactusBoy.vrm` into an empty temp directory, verify it is a VRM (glb) file, then place it at `frontend/app/public/tellers/sage/sage.vrm`.
- [x] 3.2 Generate Sage's voice prompt: in `services/tts`, run `.venv/Scripts/python make_voice.py sage --instruct "male, young adult, moderate pitch, american accent"`, producing `voices/sage.wav` and `voices/sage.txt`; rerun with `--seed`/`--instruct` if the owner dislikes the voice. (Whisper transcribed the clip back word-for-word.)

## 4. Docs and full verification

- [x] 4.1 Update the video-calls section of `docs/operations.md` to cover Sage: his model path (`100Avatars_009` Cactus Boy, low-poly) and `make_voice.py sage`, alongside Mira's existing setup lines.
- [x] 4.2 Run `pnpm test` and `pnpm lint` (both include `pnpm adr:check`): all green.
- [x] 4.3 Live check: page and `sage.vrm` serve 200; restarted backend synthesizes a Sage sentence through the sidecar (200, audio/wav) that Whisper transcribes word-for-word; Mira's synthesis unchanged (200); a teller without `call` is still rejected (404). Headless-browser screenshots of the real app confirm Cactus Boy and Mira both render head-and-shoulders in calls. (A blank-model detour during this check was environmental: a `next start` server serving a `.next` folder clobbered by a concurrent `pnpm build`; a clean rebuild and server restart fixed it. Never rebuild while a production server is serving that `.next`.)

## 5. ADR alignment check

- [x] 5.1 Confirm the change complies with ADR-0015/0016/0013/0010/0002 as recorded in design.md; no ADR changes needed. `pnpm adr:check` passes (covered by 4.2).
