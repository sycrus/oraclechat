## Tasks

- [x] 1.1 Add `scripts/oracle-common.ps1`, `oracle-up.ps1` (with `-Watch`), `oracle-down.ps1`, `oracle-status.ps1`, `oracle-autostart.ps1`; git-ignore `logs/`.
- [x] 1.2 Parse-check every script.
- [x] 2.1 `pnpm build`; `oracle-up`: backend and production frontend on 127.0.0.1; a chat turn works through the frontend API and Tailscale. (2026-11-18: all components up on 127.0.0.1; the frontend page and Tailscale URL return 200; a Sage turn completed through `localhost:3000/api`.)
- [x] 2.2 Under `-Watch`, kill the backend and confirm a restart within about 30 seconds. (It was restarted after 21 s.)
- [x] 2.3 `oracle-down` and `oracle-status` report the stopped state. (Note: when its output is piped, `oracle-up` does not return, because the children inherit the pipe handle. This is documented; it does not affect the logon task or a terminal.)
- [x] 3.1 Write `docs/operations.md` (start, stop, status, logs, upgrade, models).
- [x] 3.2 Owner runs `oracle-autostart.ps1 -Install`, accepts ADR-0010, and confirms Oracle is up after the next login.
- [x] 3.3 ADR alignment; `pnpm test`, `pnpm lint`, `graphify update .`.
