---
name: live-check
description: Check a change in the real running OracleChat on this PC — confirm the stack is up, rebuild and restart safely, drive the app with headless Chrome, take screenshots and read them, and catch failing requests. Use for the "Live check" task in an Oracle change, when asked to see or screenshot the app, or to confirm a fix works beyond the unit tests.
---

# Live check

Production runs on this PC (ADR-0010): backend on `127.0.0.1:4000`, `next start` on `127.0.0.1:3000`, the TTS/Whisper sidecar on `:4100`, Postgres in WSL, and Ollama. **It is the owner's real app with their real chats and memories**, so be deliberate about what you send.

## 1. Is it up, and is it the new code?

```powershell
powershell -ExecutionPolicy Bypass -File scripts\oracle-status.ps1
```
Quick probes: `curl http://127.0.0.1:4000/health`, `curl http://127.0.0.1:4000/api/tts/health` (`available`, `stt`), `curl http://127.0.0.1:4100/health`.

Running services keep the **old** build until restarted. If the change touched `backend/agent` or `frontend/app`, rebuild and restart, in this order:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\oracle-down.ps1 -KeepPostgres
pnpm build
Start-ScheduledTask -TaskName 'Oracle (supervisor)'
```

Then poll `oracle-status.ps1` until the agent and frontend are up (under a minute; `logs\supervisor.log` says why if not).

- **Never run `pnpm build` while `next start` is serving `.next`.** It clobbers the live build and shows up as blank models and broken pages. This cost a whole debugging detour during the Sage avatar change.
- Don't pipe `oracle-up.ps1` output into anything; it never returns.
- A dev server instead of a rebuild: `pnpm --filter @oracle/frontend dev -p 3001` (it builds into `.next-dev`). Production owns ports 3000 and 4000.
- The TTS sidecar isn't supervised. Start it with `pnpm tts` (run it in the background) if the check involves calls.

## 2. Drive the app

```
node .claude/skills/live-check/shot.mjs [--phone] [--base URL] [--out DIR] [--console] step...
```

Steps run in order:
- `goto:/path` opens a page.
- `click:<button accessible name or exact text>` clicks it.
- `fill:<label>=<text>` types into a field.
- `press:Enter` presses a key.
- `wait:<ms>` pauses.
- `waitfor:<text>` waits up to 2 minutes for text to appear, e.g. for a teller's reply.
- `shot:<name>` saves a screenshot.

Screenshots go to `logs/live-check/` (gitignored) unless `--out` points at the scratchpad. On a failure the script saves `failure.png` and exits 1. It always lists requests that returned 4xx/5xx and any page errors. It uses the installed Chrome, so no Playwright browser download is needed.

Useful names in the UI:

| Where | Names |
|---|---|
| Chat list | `New chat`, `Search chats`, `Chats`, `You` |
| New chat | teller display names (`Mira`, `Sage`, `Astra`, `Milo`), `Back` |
| Chat | `Message` (composer), `Send message`, `Video call <Name>`, `More options`, `Back to chats` |
| Call | `Message for <Name>`, `Send`, `End call`, `Mute microphone` |

Add `?say=1` to the base URL to make a call speak the typed text verbatim. That tests voices without a model turn.

Examples:
```
# Does a teller's call render? (no message sent)
node .claude/skills/live-check/shot.mjs --phone "click:New chat" click:Milo "click:Video call Milo" wait:6000 shot:milo-call "click:End call"

# A chat turn (writes to the owner's history)
node .claude/skills/live-check/shot.mjs "click:New chat" click:Mira "fill:Message=Pull one card for my week" "press:Enter" "waitfor:<expected text>" wait:3000 shot:mira-reading
```

Headless Chrome has no microphone, so calls show "Microphone unavailable — type instead". Test speech-in with `voice-roundtrip.mjs` (the `teller-call-assets` skill) instead.

## 3. Look, then report

- **Read every screenshot** with the Read tool before claiming anything. Check what the task's live-check line asks for. For calls, the whole head and shoulders should be in frame.
- Treat any 4xx/5xx in the output as a finding unless you know why it happens. `favicon.ico` 404 is already filtered out.
- Messages you send go into the owner's real history and may become memories if memory consent is on. Keep test turns few and recognisable, and tell the owner what you sent so they can clear the chat (More options) if they want.
- If something can't be checked here (sound quality, mic, a phone over Tailscale), leave that box unticked and say exactly what the owner should do.
- Write what you saw into the task note in tasks.md, e.g. `*(2026-11-27: call renders head-and-shoulders; /api/tts 200)*`.
