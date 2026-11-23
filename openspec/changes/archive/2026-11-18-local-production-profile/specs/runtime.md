## ADDED Requirements

### Requirement: Supervised local production services

On the owner's PC, Oracle SHALL start at logon without open terminals: a supervisor SHALL keep PostgreSQL available, confirm Ollama has the chat and embedding models, run the built backend on `127.0.0.1:4000` and the built frontend on `127.0.0.1:3000`, and restart any of them that stops. Remote access SHALL be tailnet-only through Tailscale serve. Neither web port SHALL listen on non-loopback interfaces.

#### Scenario: Oracle is up after login
- **WHEN** the owner logs in to Windows
- **THEN** Postgres, the backend and the frontend become available without manual steps
- **AND** the backend and frontend listen only on 127.0.0.1

#### Scenario: A crashed component is restarted
- **WHEN** the backend process stops while the supervisor runs
- **THEN** it is running again within about 30 seconds

#### Scenario: Missing build
- **WHEN** the supervisor starts and a build output is missing
- **THEN** it reports that `pnpm build` must run first instead of starting a broken service
