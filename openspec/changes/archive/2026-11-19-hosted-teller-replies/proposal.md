## Intent

Let the owner opt in to a stronger hosted model for teller replies, while routing, memory and embeddings stay on the PC, and saved memories stay private unless separately shared. Closes #2.

## Why now

#1 settled the local production profile (ADR-0010), which #2 was waiting on. The owner chose: any OpenAI-compatible API, teller replies only, memories only with a second opt-in, and an `.env` switch.

## What changes

- **Configuration.** `HOSTED_BASE_URL`, `HOSTED_API_KEY` and `HOSTED_MODEL`: all three turn hosted replies on, none keeps Oracle local, and a partial set stops startup.
- **Teller replies** stream from the hosted model when configured. Routing, memory extraction and embeddings stay local. There is no fallback in either direction.
- **Second opt-in.** A *Share saved details with the hosted model* setting, off by default. Memories reach hosted replies only when it and memory consent are both on. Revoking memory consent clears it.
- **API.** `GET /api/memory` adds `hostedReplies` and `hostedConsented`. A new `PUT /api/memory/hosted-consent` rejects changes unless hosted replies are configured and memory is on.
- **UI.** The top bar shows "Hosted model" instead of "Local models" when hosted replies are on, and the memory panel shows the sharing toggle.
- **Tracing.** Reply spans record `oracle.teller.hosted` and the provider label. The key and content never appear.
- **ADR-0014** (Proposed) records the decision.

## Non-goals

- Hosting routing, memory extraction or embeddings.
- Choosing local or hosted per conversation or per teller.
- Native (non-OpenAI-compatible) provider SDKs.
- Automatic failover between local and hosted.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0009, ADR-0010, ADR-0012, ADR-0014
