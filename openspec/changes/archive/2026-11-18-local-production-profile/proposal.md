## Intent

Run Oracle as an always-on service on the owner's PC (#1): everything starts at login and restarts if it stops, with no terminals left open.

## Why now

Today the owner keeps a WSL terminal open for PostgreSQL, runs the Next.js dev server by hand (listening on all interfaces), and starts the backend by hand. Ollama and Tailscale already start on their own. #1 asks for a recorded production profile; the owner chose this PC, the current model, and supervised services.

## What changes

- **ADR-0010** (Proposed) records the production profile: this PC, `qwen3.5:9b` with `nomic-embed-text` on Ollama, PostgreSQL in WSL, tailnet-only access, and supervised services. Hardware guidance for others is deferred.
- **Scripts** in `scripts/`:
  - `oracle-up.ps1 [-Watch]`: starts any missing component in order (WSL keep-alive for Postgres, then a check that Ollama has both models, the backend on `127.0.0.1:4000`, and the built frontend on `127.0.0.1:3000`). With `-Watch` it stays running and restarts stopped components every 30 seconds.
  - `oracle-down.ps1`: stops the backend, the frontend and the keep-alive.
  - `oracle-status.ps1`: shows each component, its port and its bind address.
  - `oracle-autostart.ps1 -Install|-Uninstall`: registers or removes a user-level Scheduled Task that runs `oracle-up.ps1 -Watch` hidden at logon. The owner runs it.
- **Operations doc** `docs/operations.md`: start, stop, status, logs, upgrade (`pnpm build` and restart), and model checks.

## Non-goals

- Hardware sizing for other self-hosters (deferred, per the owner).
- A hosted fallback (#2), Docker, or Windows services that need admin rights.
- Changing the model or the Tailscale configuration.

ADRs reviewed: ADR-0002, ADR-0004, ADR-0007, ADR-0009, ADR-0010
