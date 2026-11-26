# Running Oracle on this PC

Oracle runs as supervised local services on the owner's Windows PC (ADR-0010). You reach it on your own devices through Tailscale at `https://flamegame.tail182b7e.ts.net:8443`. Nothing is exposed to the public internet or the LAN.

| Component | Where | Started by |
|---|---|---|
| Ollama (`qwen3.5:9b`, `nomic-embed-text`) | `127.0.0.1:11434` | Ollama's own Windows startup entry |
| PostgreSQL + pgvector | WSL `Ubuntu-24.04`, `127.0.0.1:5432` | systemd, kept alive by the supervisor |
| Backend (`backend/agent/dist`) | `127.0.0.1:4000` | supervisor |
| Frontend (`next start`) | `127.0.0.1:3000` | supervisor |
| Tailscale serve `:8443 → 3000` | tailnet only | Tailscale service (persistent) |

## One-time setup

```powershell
pnpm install
pnpm build
powershell -ExecutionPolicy Bypass -File scripts\oracle-autostart.ps1 -Install
Start-ScheduledTask -TaskName 'Oracle (supervisor)'   # or just log out and back in
```

The task `Oracle (supervisor)` runs `scripts\oracle-up.ps1 -Watch` hidden at logon. It checks every 30 seconds and restarts anything that stopped. To remove it: `scripts\oracle-autostart.ps1 -Uninstall`.

## Everyday commands

```powershell
powershell -ExecutionPolicy Bypass -File scripts\oracle-status.ps1   # what is up, and where it listens
powershell -ExecutionPolicy Bypass -File scripts\oracle-down.ps1     # stop backend, frontend, keep-alive and supervisor
powershell -ExecutionPolicy Bypass -File scripts\oracle-up.ps1       # start whatever is missing (add -Watch to supervise)
```

`oracle-down` leaves Ollama and Tailscale running. With `-KeepPostgres` it also leaves the database up.

Run these from a terminal. If you pipe `oracle-up`'s output into another program, the command won't return, because the processes it starts inherit the pipe. The services still start correctly.

## Logs

`logs\` (git-ignored):
- `supervisor.log`: starts, restarts and warnings;
- `agent.log`, `agent.err.log`: backend;
- `frontend.log`, `frontend.err.log`: Next.js;
- `postgres-keepalive.log`: the WSL keep-alive.

Traces go to Langfuse and LangSmith when their keys are set (see `.env.example`). By default they carry no content: span names, timings, model names and token counts only, so Langfuse shows Input and Output as "undefined".

To see prompts and replies while debugging, set `TRACE_CONTENT=1` and restart the backend; startup then logs a warning. Each model call's span records its instructions (which can include recalled memories and readings), the message and the reply. Every configured destination receives this, so leave `LANGSMITH_API_KEY` empty if content should stay on the PC. Unset it again when you are done.

To also see hosted teller replies in the OpenAI Traces dashboard (platform.openai.com → Logs → Traces), set `OPENAI_TRACES=1` (ADR-0022). It needs hosted replies with `HOSTED_BASE_URL=https://api.openai.com/v1`, or the backend refuses to start. Each hosted reply then becomes one `Oracle teller reply` trace, sent with `HOSTED_API_KEY` and carrying the teller name and the OpenTelemetry trace ID (`otel_trace_id`) so you can find the same turn in Langfuse. Routing, memory, guardrail checks and local replies are never sent there. The trace includes the prompt and reply only when `TRACE_CONTENT=1` is also on. OpenAI keeps these traces under your project's retention, and turning the switch off doesn't delete them. You can grade them in the dashboard; Oracle itself uses no OpenAI Evals API.

## Upgrading

```powershell
git pull
pnpm install
pnpm build
powershell -ExecutionPolicy Bypass -File scripts\oracle-down.ps1 -KeepPostgres
Start-ScheduledTask -TaskName 'Oracle (supervisor)'   # starts the services from the new build and supervises them
```

The restart is required: `pnpm build` only writes new files, and the running services keep the old code until they are stopped and started again. A call that says "voice offline" while the speech service is healthy usually means the backend is still the old one (`/api/tts` returns 404).

Starting the supervisor task runs `oracle-up -Watch`, so a separate `oracle-up` is not needed. If the services don't come back within a minute, check `oracle-status.ps1` and `logs\supervisor.log`; the task stops at once, logging nothing, when `backend/agent/dist` or `frontend/app/.next` is missing.

### Dev servers beside production

`pnpm --filter @oracle/frontend dev` builds into `frontend/app/.next-dev`, so it can run while production serves `.next`. Give dev servers their own ports (production owns 3000 and 4000): if production is stopped, a dev frontend can take port 3000 and answer "agent unavailable" in its place. Before 2026-11-19 dev and production shared `.next`, and a running dev server could wipe the production build.

Database changes apply automatically when the backend starts (idempotent `CREATE`/`ALTER … IF NOT EXISTS`).

## Models

```powershell
ollama pull qwen3.5:9b
ollama pull nomic-embed-text
```

`oracle-status` warns if either model is missing. Settings in `.env`:
- `OLLAMA_MODEL` and `OLLAMA_EMBED_MODEL`;
- `TELLER_THINKING` (default `false`);
- `HISTORY_TOKEN_BUDGET` (default `8000`);
- `BRAVE_SEARCH_API_KEY` (optional, ADR-0012): lets the tellers look things up. When current facts would help, a teller's short search query is sent to Brave Search without asking first; history and memories are never sent. Its sources are shown under its reply. Leave it empty and no search is ever made. Restart Oracle after changing it.
- Pasted links: Oracle fetches up to two `http(s)` links from a message on the PC and gives the page text to the tellers, with or without a search key. The linked site sees the PC's public IP. Links to the PC itself, the LAN or the tailnet are refused.
- `HOSTED_BASE_URL`, `HOSTED_API_KEY`, `HOSTED_MODEL` (optional, ADR-0014): set all three to have teller replies written by a hosted OpenAI-compatible model (OpenAI, OpenRouter, Anthropic's OpenAI-compatible endpoint and similar). Leave all three empty to stay fully local. If only some are set, the backend refuses to start and names the missing ones.
  - What leaves the PC: each reply's instructions and conversation context (recent history, readings, link text and that teller's search results). Routing, memory extraction and embeddings stay local.
  - Saved memories are sent only if you also turn on *Share saved details with the hosted model* in the **You** tab. Turning memory off clears that setting.
  - There is no fallback: if the hosted provider fails, the turn shows an error. The **You** tab header says "Hosted model" while this is on ("Local models" otherwise). Usage is billed by the provider.
  - Restart Oracle after changing these.
- `OPENAI_TRACES` (optional, ADR-0022): `1` also sends each hosted teller reply to the OpenAI Traces dashboard. It needs `HOSTED_BASE_URL` on `api.openai.com`. See the tracing notes above.
- To compare local and hosted replies on 24 fixed prompts, run `pnpm --filter @oracle/agent eval:models` with Ollama running and hosted replies configured. It writes a summary and transcripts to `backend/agent/eval/results/`. The prompts are in `backend/agent/eval/cases.ts`. It calls the hosted model, so it is billed.

### Guarded mode: OpenAI guardrails (ADR-0021)

Guardrails run only when the backend is started with its own command:

```powershell
pnpm --filter @oracle/agent start:guarded   # instead of start
```

- Settings in `.env`: `OPENAI_GUARDRAILS_API_KEY` and `OPENAI_GUARDRAILS_MODEL` (the small classifier model for the ethics check). With `start:guarded`, the backend refuses to start if either is missing and names it. With plain `start`, these variables do nothing and no guardrail request is ever made. The key is separate from `HOSTED_API_KEY`, and guardrails work with local or hosted replies.
- What leaves the PC, always to `api.openai.com`: the text of each user message (OpenAI moderation), and each teller reply sentence with the reply text before it (moderation plus the ethics classifier). Memories, history, birth details, readings, link pages and search results are never sent.
- What it does: a message that signals self-harm starts a care turn. One teller steps out of the reading and answers sincerely, the app then shows support text that points to emergency services and findahelpline.com, and nothing from that turn is saved as a memory. The app never contacts anyone for the user. A reply sentence that fails a check is never shown or spoken: the reply stops at the last sentence that passed, or an app-written line stands in.
- It fails closed: if OpenAI errors or a check takes longer than 5 seconds, the turn shows an error. Restart with plain `start` to go back to local-only.
- The **You** tab header adds "· OpenAI guardrails" while it is on. Checks show in traces by outcome and category only, never text. Usage is billed by OpenAI.
- The supervisor (`oracle-up`, the logon task) always starts plain `start`. To run guarded, stop the agent with `oracle-down`, then start it with the command above from the repository root. A supervisor running with `-Watch` would restart a stopped agent *without* guardrails.

The model runs with a 32,768-token context on the RTX 5080. Hardware guidance for other machines is deferred (ADR-0010).

## Video calls (ADR-0015)

The video-camera button in a one-to-one chat with Mira, Sage, Astra or Milo opens a call where the teller speaks with a voice made on the GPU by OmniVoice. The 3D teller is drawn through a pixel filter: rendered at low resolution, snapped to the 16-colour call palette and scaled up without smoothing (ADR-0019). Speech always stays on the PC, even with hosted replies on. The speech sidecar isn't supervised yet, so start it by hand. Without it, calls still open and show subtitles marked "Voice offline".

One-time setup (about 3 GB, Python 3.12 via `uv`):

```powershell
cd services/tts
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe torch==2.8.* torchaudio==2.8.* --index-url https://download.pytorch.org/whl/cu128
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python make_voice.py mira --instruct "female, young adult, low pitch, american accent"
.venv/Scripts/python make_voice.py sage --instruct "male, young adult, moderate pitch, american accent"
.venv/Scripts/python make_voice.py astra --instruct "female, middle-aged, moderate pitch, british accent" --text "Right, so the planets aren't going to make your choices for you. But they do show you what season you're in, and honestly, that's half the battle."
.venv/Scripts/python make_voice.py milo --instruct "male, young adult, low pitch, british accent" --text "Right, let's make the work problem smaller. Is it about people, process, or purpose?"
```

Run `make_voice.py` again (try `--seed`) until the voice sounds right; calls clone from `services/tts/voices/<teller>.wav` and its `.txt` transcript.

Generate each teller's voice reference during local setup. The command above creates Milo's `services/tts/voices/milo.wav` and matching `milo.txt`; voice clips and transcripts are gitignored.

- `.env`: `TTS_BASE_URL=http://127.0.0.1:4100` and `OMNIVOICE_MODEL_PATH` (the OmniVoice folder, e.g. ComfyUI's `models/omnivoice/OmniVoice`).
- Start: `pnpm tts` (listens on `127.0.0.1:4100`; about 4.8 GB of VRAM next to the chat model).
- 3D models: place a VRM at `frontend/app/public/tellers/<teller>/<teller>.vrm` for Mira, Sage, Astra and Milo. Download Milo's Cool Polygonal Mind model from `100Avatars_200/100Avatars_200_CoolPolygonalMind.vrm` in [PolygonalMind/100Avatars](https://github.com/PolygonalMind/100Avatars). The other models are Rose (`100Avatars_057/100Avatars_057_Rose.vrm`), Cactus Boy (`100Avatars_009/100Avatars_009_CactusBoy.vrm`) and Cosmic Person (`100Avatars_129/100Avatars_129_CosmicPerson.vrm`). These models are licensed CC BY 4.0; see [asset attribution](asset-attribution.md). Kept beside Mira's: her voxel version as `mira.rose-voxel.vrm`, and the earlier stand-in, pixiv's `VRM1_Constraint_Twist_Sample.vrm` from the three-vrm repository, as `mira.vroid-sample.vrm`. Kept beside Astra's: her voxel version as `astra.cosmic-voxel.vrm`. Any humanoid VRM works, VRM 0.x or 1.0: the call frames the camera from the model's head, so stylized models with big heads show their whole face. The 100Avatars low-poly versions have mouth shapes and blink; the voxel versions add `happy`, `relaxed` and `sad`; an expression a model lacks stays neutral.
- Body animations: `frontend/app/public/animations/` holds `idle.vrma` (looped while idle, listening and thinking) and `talk-1.vrma` … `talk-3.vrma` (one per turn while speaking, kept through short gaps between sentences). They are VRM Animation files converted from Mixamo, shared by every teller. Without `idle.vrma` the call uses its procedural pose and breathing; without talking clips the idle clip continues while speaking. The browser console logs `[call] body animation unavailable: <file>` for each missing file.
  - Get clips: on mixamo.com pick an animation and download it as **FBX Binary**, **Without Skin**, **30 fps**, **no keyframe reduction**. Mira uses Breathing Idle, Talking, Talking 2 and Talking 3.
  - Convert (needs Blender 5.1+ with the "VRM format" extension): `blender -b --python scripts/mixamo-to-vrma.py -- frontend/app/public/animations "idle=<Breathing Idle.fbx>" "talk-1=<Talking.fbx>" "talk-2=<Talking 2.fbx>" "talk-3=<Talking 3.fbx>"`. It maps Mixamo's bones, fingers included, onto VRM human bones and prints `OK <name>.vrma` per file.
  - Mixamo files may be used in your projects but not redistributed, so the FBX downloads and the converted clips stay out of git.
- Voice clips, the venv, `.vrm` and `.vrma` files are gitignored, so a fresh clone needs these local setup assets again.
- The call bar along the bottom holds the text box, send, the mic button (when the mic works) and end call, all on one line. What you type goes to the conversation: Mira thinks (hand on chin), then answers aloud one sentence at a time with matching expressions, and the exchange is saved to the chat. Open the page with `?say=1` to make her repeat what you type instead (voice testing).
- Talking (ADR-0016): the mic opens with the call (the mic button in the call bar mutes it). Speak, then pause for about a second, and Mira answers; talking over her stops her. Speech is transcribed by Whisper in the same sidecar: set `WHISPER_MODEL_PATH` to the large-v3-turbo folder (e.g. ComfyUI's `models/audio_encoders/openai_whisper-large-v3-turbo`; about 1.8 GB of VRAM more, 15.6 of 16.3 GB in use with the chat model and OmniVoice). Without it, or if the mic is blocked, the call says so and typing still works. Your audio is never saved or traced. Use headphones if Mira's own voice keeps interrupting her.
- Readings in a call (ADR-0020) work as in the chat and appear in a panel just above the call bar: Mira's fan of face-down cards, Sage's coin toss, or Astra's birth-details form when no details are saved. Each teller speaks the fixed invitation, you pick, toss or fill in the form in the panel, and the interpretation is spoken. The panel then keeps a compact result (the pixel tarot cards with Mira's action card, the I Ching card, or the chart summary) until the next reading; "Line by line" and the full chart open above the call. Everything is saved to the chat.
- Lip sync: her mouth takes vowel shapes from the playing audio with wLipSync, using the sample profile in `frontend/app/public/lipsync/` (MIT, calibrated on another voice; see its README). It needs a secure context (`localhost` or https): over plain http on the LAN, or if the profile fails to load, the mouth only follows loudness and the console logs `[call] vowel lip sync unavailable`.
- The first call turn after a few idle minutes can take ~10 s while Ollama reloads the chat model; after that her first word comes in about 2 s.

## One chat per teller

Each teller, and each pair of tellers, has exactly one chat. Starting a chat with a teller you already talk to reopens that chat, and the list shows one row per correspondent, named after the teller ("Mira", "Mira & Sage"). Within a chat, date pills ("Today", "Yesterday", a weekday, then a date) mark each day. Databases from before this rule can hold several chats with the same teller; the app opens the most recent one and the older ones stay listed until deleted.

## Backups

The supervisor does not back up the database. Before anything destructive (deleting chats in bulk, schema experiments), take a dump from WSL:

```powershell
wsl -u root -- bash -lc "mkdir -p /mnt/c/Users/<you>/AppData/Local/oracle-backups && su postgres -c 'pg_dump -Fc agent_memory' > /mnt/c/Users/<you>/AppData/Local/oracle-backups/agent_memory-$(date +%Y%m%d-%H%M%S).dump"
```

Restore with the services stopped (`oracle-down.ps1 -KeepPostgres`): `su postgres -c "pg_restore --clean --if-exists -d agent_memory <file>"`, then `oracle-up.ps1`.

## Astra's birth details and places

Astra reads the owner's birth chart (ADR-0018). The owner's birth date, time and place are saved once, with consent, in the `birth_profile` table of the local database. They can be viewed, changed or deleted under **You → Birth details**. If they are missing when Astra is asked for a reading, she lays out the birth-details form, in the chat or in a call. Tellers receive only the computed chart, and hosted replies get it without degrees unless *Share saved details with the hosted model* is on. Birth details are never sent to memory, traces or logs.

Birth places come from `backend/agent/data/places.json`, a committed extract of GeoNames `cities15000` (CC BY 4.0; see `places.provenance.md`). The lookup is offline. To refresh it, download `cities15000.zip` (unzipped), `admin1CodesASCII.txt` and `countryInfo.txt` from https://download.geonames.org/export/dump/ and run `node scripts/build-places.mjs <cities15000.txt> <admin1CodesASCII.txt> <countryInfo.txt>`.
