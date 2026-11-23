# ADR-0010: Production profile is the owner's PC with supervised local services

**Status:** Accepted
**Date:** 2026-11-18
**Supersedes:** None (resolves the production inference host that ADR-0002 left undecided, and extends ADR-0007)

## Context

ADR-0002 made Ollama the local inference path but left the production host, model and hardware undecided. ADR-0007 scoped the MVP to the development machine without promising it as production. In practice, Oracle runs on the owner's Windows 11 PC (RTX 5080, 16 GB VRAM) and is reached from the owner's devices over Tailscale. Each piece is started by hand: the backend, the Next.js dev server, and a WSL terminal kept open so PostgreSQL stays up. Ollama and Tailscale already start at login. #12 settled the model runtime: thinking off and bounded history.

## Decision

- **Host.** Oracle's production deployment is the owner's PC. Remote access is tailnet-only, through `tailscale serve` (`https://<pc>.<tailnet>.ts.net:8443` → `127.0.0.1:3000`). Nothing is exposed to the public internet or the LAN.
- **Models.**
  - Chat: `qwen3.5:9b` (Q4_K_M, about 6.6 GB of VRAM) through native Windows Ollama, at the 32,768-token context Ollama selects for this GPU. Thinking is off for ranking and memory, and off by default for tellers (`TELLER_THINKING`).
  - Embeddings: `nomic-embed-text`.
- **Data.** PostgreSQL with pgvector in WSL Ubuntu, started by systemd.
- **Services.**
  - One supervisor script (`scripts/oracle-up.ps1 -Watch`) runs hidden at Windows logon from a user-level Scheduled Task. It is registered by the owner with `scripts/oracle-autostart.ps1`.
  - The supervisor keeps WSL alive (and with it PostgreSQL), waits for Postgres and Ollama, and runs the built backend on `127.0.0.1:4000` and the built Next.js app (`next start`) on `127.0.0.1:3000`. It restarts any component that stops and writes logs to `logs/`.
- **Upgrades.** Pull, run `pnpm install` and `pnpm build`, then restart with `scripts/oracle-down.ps1` followed by `scripts/oracle-up.ps1`. Database migrations are the existing idempotent `initialize()` statements.
- **Hardware guidance for other self-hosters is deferred.** Smaller models are an option, to be revisited once the product is more settled.

## Consequences

- Oracle is available whenever the owner is logged in to the PC. It stops when the PC sleeps or shuts down; there is no hosted fallback (#2 remains optional and separate).
- Running the production Next.js build removes the dev server's overhead and LAN exposure, but the frontend must be rebuilt after changes.
- A single 16 GB GPU serves both models. A larger chat model would need a new decision.
- Scheduled Task registration is a deliberate owner action, not something the app does to itself.

## Validation

- `scripts/oracle-status.ps1` reports Postgres, Ollama (with both models present), the backend health and the frontend as up, with the backend and frontend bound to `127.0.0.1` only.
- After `oracle-down` and `oracle-up`, a chat turn succeeds over the Tailscale URL.
- Killing the backend process causes the supervisor to restart it within about 30 seconds.
