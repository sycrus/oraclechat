# Oracle delivery milestones

Milestones are dependency-ordered and acceptance-driven. Each behavior change must have an OpenSpec requirement and a failing test before implementation. Milestones end with a working local demo; calendar estimates follow a local model benchmark on the target machine.

## 0. Product and spec baseline

**Status:** Complete. The PRD, OpenSpec requirements, and ADRs are aligned; the ADR check passes.

- Confirm the MVP boundaries and record durable architecture decisions.
- Define measurable acceptance scenarios for teller selection, tarot draws, persistence, and memory consent.
- Check ADR alignment before implementation starts.

## 1. Local development foundation

**Status:** Complete. The app uses local PostgreSQL 16 with pgvector in Ubuntu WSL2 and Ollama `qwen3.5:9b`; the live backend connected to both without an OpenAI API key. The WSL setup is reproducible with `scripts/setup-local-postgres-wsl.sh`.

- Run the app, local PostgreSQL/pgvector, and Ollama on the Windows 11 development machine (RTX 5080, 16 GB VRAM).
- Establish the Agents SDK integration and reconcile the Zod version boundary.
- Add provider-neutral OpenTelemetry traces, with optional Langfuse/LangSmith export.
- Verify the baseline works without an OpenAI API key.

**Acceptance:** verified `GET /health`, a real `READY` response from Ollama, and a live backend startup against PostgreSQL with no hosted API key.

## 2. Persistent chat and teller orchestration

**Status:** Complete. Live 1:1 and two-teller conversations streamed local Ollama replies and persisted them in PostgreSQL. The frontend page and same-origin conversation proxy returned successfully. Automated storage, routing, threshold, SSE, and frontend checks pass.

- Persist conversations and attributed messages.
- Add Mira and Sage definitions and a desktop-first conversation list/chat pane.
- Rank group tellers using activation profiles, the current message, and consented context. The highest-ranked teller always responds; the second responds only at or above the configured participation threshold. Break ties by least-recently-spoken.
- Stream the selected teller's response and preserve cross-teller context if both respond.

**Acceptance:** tests cover 1:1 routing, ranking, threshold boundaries, ties, attribution, and cross-teller context. Live checks demonstrated Mira 1:1 chat and a two-teller conversation where the local ranker selected Sage.

## 3. Tarot reading flow

**Status:** Complete. Live database-backed turns persisted both a three-card spread and a one-card spread with their teller replies; catalog and renderer tests pass.

- Implement app-owned random draws for one-card and three-card spreads; default to three cards.
- Keep card count and positions fixed by spread type; pass the fixed draw to the teller for interpretation.
- Render inline tarot components with orientation-aware original meanings and illustrated cards.

**Acceptance:** tests verify draw size, valid positions, draw immutability during interpretation, spread rendering, and fallback for invalid component data.

## 4. Consent-based memory

**Status:** Complete. In the local app, memory started off, explicit opt-in enabled extraction of two synthetic test facts, and revocation cleared them. Automated tests cover recall gating, editing/deletion, and conversation-source cleanup.

- Add explicit one-time opt-in, extraction of relevant facts, and memory view/edit/delete controls.
- Keep transcripts and extracted memories distinct while linking memories to their source conversations.
- Cascade conversation deletion to source-linked memories. Revoking consent stops writes and deletes all saved memories.

**Acceptance:** tests verify no memory access/write before consent, recall after consent, editing/deletion, source-linked cleanup, and revocation behavior.

## 5. Original content and visual polish

**Status:** Complete. Original card content and provenance, accessible vector artwork, and responsive conversation navigation are implemented. Frontend unit tests and the production build pass; the local page returned HTTP 200. Browser screenshot inspection was unavailable because the computer-use transport was closed.

- Replace placeholders with original tarot meanings and generated/original card imagery.
- Improve the visual system and responsive behavior after desktop-first flows are usable.
- Revisit further disciplines beyond tarot and the I Ching casting, hosted models, and multi-user deployment as separate scoped changes.

**Acceptance:** content has provenance recorded; visual components remain valid and accessible. Deferred capabilities require new OpenSpec changes before implementation.

## 6. Tellers, calls and OracleChat

**Status:** Complete (2026-11-23). Each piece shipped as its own OpenSpec change, now in `openspec/changes/archive/`. Backend and frontend test suites, lint and the ADR check pass.

- Sage reads the I Ching and Astra reads the birth chart (ADR-0013, ADR-0018); the tellers ask for readings and look things up themselves (ADR-0012), and teller replies can optionally come from a hosted model (ADR-0014).
- Video calls with a speaking 3D teller: OmniVoice voices, lip sync, body animations, and local speech recognition (ADR-0015, ADR-0016).
- Interactive readings: Mira's card fan, Sage's coin toss and Astra's birth-details form (ADR-0017), also in calls (ADR-0020).
- OracleChat (ADR-0019): the WhatsApp-style pixel interface with one chat per teller or pair, teller profile pictures, pixel tarot cards, date pills, and a pixel-filtered call with one call bar.

**Acceptance:** each change's scenarios are covered by tests, and each was checked running in a browser; video-call voices were checked by transcribing them with Whisper.

## 7. Workplace-reflection teller

**Status:** In progress.

- Add Milo with seven short, app-owned workplace reflection tools selected from the current chat context.
- Keep MBTI-like discussion informal and conversational; do not produce a formal personality score or company-fit verdict.
- Use the Polygonal Mind Cool Polygonal Mind VRM with attribution; generate a dedicated local voice reference when the TTS environment is available.

**Acceptance:** route tests cover relevant and irrelevant contexts, invalid tool output is dropped, the user can decline each offer, Milo works in one-to-one and pair chats, and his model loads in a call.
