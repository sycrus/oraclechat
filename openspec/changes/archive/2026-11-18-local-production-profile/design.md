## Context

- **Already automatic:**
  - Ollama (Windows Startup entry, `127.0.0.1:11434`);
  - Tailscale (Windows service), which keeps `:8443 → 127.0.0.1:3000` across reboots;
  - PostgreSQL inside WSL Ubuntu-24.04 (systemd enabled).
- **The gap:** WSL 2.6 shuts the distro down when no Windows process holds it, so Postgres disappears unless a terminal stays open.
- **Manual today:**
  - backend: `node --env-file-if-exists=../../.env dist/server.js` in `backend/agent`, bound to `127.0.0.1:4000`;
  - frontend: `next dev`, bound to `::`, port 3000.

## Decision

- **Shared helpers** live in `scripts/oracle-common.ps1`. They cover the repo root, the logs directory, `Test-Port`, `Get-PortOwner` and the component table:

  | Component | Check | Start |
  |---|---|---|
  | postgres | port 5432 | hidden `wsl.exe -d Ubuntu-24.04 --exec sleep infinity` (keep-alive; systemd starts Postgres) |
  | ollama | `GET /api/tags` lists the chat model and `nomic-embed-text` | not started (Ollama's own startup entry does that); reported if missing |
  | agent | `GET http://127.0.0.1:4000/health` | hidden `node --env-file-if-exists=../../.env dist/server.js` in `backend/agent`, logging to `logs/agent.log` |
  | frontend | port 3000 | hidden `node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000` in `frontend/app`, logging to `logs/frontend.log` |

  - **Order:** postgres, then ollama, agent and frontend. The agent waits up to 60 seconds for Postgres.
  - **Build guard:** if `backend/agent/dist/server.js` or `frontend/app/.next/BUILD_ID` is missing, `oracle-up` stops with "run pnpm build first".
- **`oracle-up.ps1 -Watch`** loops every 30 seconds, restarting any component whose check fails. It writes one line per restart to `logs/supervisor.log`.
- **`oracle-down.ps1`** stops the processes that own ports 4000 and 3000, and the keep-alive (a `wsl.exe` process whose command line contains `sleep infinity`). It leaves Ollama and Tailscale running.
- **`oracle-status.ps1`** prints each component's state and listening address. The agent and frontend must be on `127.0.0.1`.
- **`oracle-autostart.ps1`** registers or removes the user-level task `Oracle (supervisor)`:
  - trigger at logon of the current user;
  - action `powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File scripts\oracle-up.ps1 -Watch`;
  - restart on failure 3 times, at 1-minute intervals; no time limit.

  No admin rights are needed. The owner runs it, because it is persistent system configuration.
- **Logs:** `logs/` is git-ignored.

Rejected:
- **pm2 or NSSM:** an extra dependency, and NSSM needs admin rights.
- **Running Postgres natively on Windows:** a second database install; the WSL setup already works.
- **Keeping `next dev`:** slower, with hot-reload overhead and binding to all interfaces.

## Verification

The PowerShell scripts are checked live rather than with unit tests:
1. Parse-check every script with the PowerShell parser.
2. Run `oracle-status`.
3. Run `pnpm build`, then `oracle-up`: the backend and production frontend come up bound to `127.0.0.1`, and a chat turn works through `localhost:3000/api` and the Tailscale URL.
4. Kill the backend under `-Watch`: it is restarted within about 30 seconds.
5. Run `oracle-down`, then `oracle-status`.

The owner then runs `oracle-autostart.ps1 -Install` and confirms Oracle is up after the next login.

## ADR alignment

- ADR-0010 (Proposed here): implements it.
- ADR-0002: local Ollama only, with no hosted fallback.
- ADR-0004: telemetry configuration is unchanged.
- ADR-0007: single-user, and still local to the owner's machine.
- ADR-0009: the embedding model presence is checked at startup.

ADRs reviewed: ADR-0002, ADR-0004, ADR-0007, ADR-0009, ADR-0010
