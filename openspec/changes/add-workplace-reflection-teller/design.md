## Context

- Teller definitions are YAML validated by `backend/agent/src/tellers/schema.ts` and loaded by `TellerRegistry`.
- `ChatService` supports only disciplines with application-owned methods. `routeTurn` returns validated per-teller route data and already sees the current message plus the previous turn's replies, but never saved memories.
- Calls currently render VRM models. Polygonal Mind's 100Avatars repository supplies the chosen asset as VRM and uses CC BY 4.0; the existing renderer supports its VRM 0.x format.
- Oracle's UI uses the existing chat bubble flow. No new card component is needed for text prompts.

## Decision

- Add `workplace-reflection` as a supported discipline and register Milo in the existing teller roster.
- Add a nullable `workplaceTool` enum to each route. Only a workplace-reflection teller may receive one of the app-defined values: `three-lenses`, `team-weather`, `meeting-oracle`, `culture-signals`, `fork-in-the-road`, `strength-in-disguise`, or `role-compass`. Invalid or omitted values normalize to no tool.
- The local router chooses no more than one tool per teller per turn using the current message and previous replies. It returns only the enum; no prompts, payloads, scores or UI instructions are model-authored.
- Pass a fixed app-written instruction for the chosen tool to Milo. Milo makes a brief optional offer or asks one focused question in ordinary chat. The user can decline, ignore it or continue talking. Any follow-up stays in chat; no persistent questionnaire state is added.
- Keep the tools non-diagnostic. A work-style snapshot may mention informal preferences but must not claim to determine an official MBTI type. Company-culture reflection discusses fit as mutual preferences and tradeoffs, never a categorical person/company verdict.
- Use `100Avatars_200_CoolPolygonalMind.vrm` from `PolygonalMind/100Avatars` (the repository README says these avatars were rigged and given visemes). Its VRM 0.x metadata has 50 humanoid bones and A/E/I/O/U blend shapes. The repository supplies a CC BY 4.0 license; attribute Polygonal Mind, link the source repository and license, and note any modifications. Keep the `.vrm` out of git under the existing local-asset convention. A live visual call check remains part of verification.

## TDD and verification

Write failing focused tests first for router enum validation and discipline gating, supported conversation creation, tool-context delivery, and prompt safeguards. Then implement the smallest changes, run focused package tests and lint, run the full prescribed checks, and inspect the model in the call stage if it is compatible. The local browser tooling was unavailable in this environment, so the live visual check could not run.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0008, ADR-0009, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0017, ADR-0019, ADR-0021, ADR-0022

- ADR-0001: OpenSpec remains the behavior source of truth.
- ADR-0002 and ADR-0003: model selection is local and tool effects remain application-owned.
- ADR-0008 and ADR-0012: existing group response and teller-led behavior remain; the router chooses a bounded tool name without changing response order or consulting memories.
- ADR-0013: Milo has one specialty, workplace reflection, with fixed app-owned reflection methods; no model-generated assessment result is treated as authoritative.
- ADR-0015 and ADR-0019: the model must meet current call rendering and pixel UI requirements before a call button is exposed.
- ADR-0017: the tool set is closed and enum-validated; no model-authored UI or payload is introduced.
- ADR-0009, ADR-0014, ADR-0021 and ADR-0022: existing memory consent, hosted reply, guardrail and trace policies continue to apply.
