# Oracle product requirements

## Product

Oracle is a self-hosted, single-user app for chatting with a small team of personable fortune tellers who help users reframe life situations. It includes Mira (tarot), Sage (I Ching) and Astra (astrology), one-to-one and two-teller group chats, interactive readings, video calls with a speaking 3D teller, and consent-based memory. Its interface is **OracleChat**, a 4-bit pixel chat app laid out like WhatsApp. OpenSpec is the source of truth for product behavior; see [`openspec/specs/`](../openspec/specs/).

## First release scope

- Mira is the warm, sharp tarot reader; Sage is a calmer, reflective counterpart who reads the I Ching; Astra is a wry, big-picture astrologer.
- Users can chat with one teller or with any two together. There is one chat per teller and per pair; starting a chat with someone you already talk to reopens it. In a group chat both tellers respond (ADR-0008), in an order set by a local model that ranks relevance against topics, emotional tones, situations, the message and consented context; ties go to the least-recently-spoken.
- Each teller has a speciality: Mira reads tarot, Sage reads the I Ching and Astra reads the birth chart. The user asks a teller for a reading in words ("Mira, read for me", "can you both do a reading?"); there is no reading control in the composer. A reading request without a name goes to the first teller to reply. The app owns every draw: a tarot spread (one-card, three-card or Celtic Cross, as asked or as fits, plus Mira's action card), an I Ching casting (three-coin method, six lines, with a relating hexagram when lines change), or a natal chart with its current transits, computed from birth details the owner saved with consent (ADR-0018). The teller interprets it and cannot change it, and it is shown with that teller's reply. Readings can be interactive (ADR-0017): Mira lays out a fan of face-down cards for the user to pick, Sage has the user toss the coins line by line, and Astra asks for birth details with a form when none are saved. The same interactions work in video calls (ADR-0020). Messages without a request are plain conversation (ADR-0012). Other disciplines are later scope.
- Conversations persist in local PostgreSQL. Memory is off until the user explicitly opts in once. Users can inspect, edit, and delete memories. Deleting a conversation deletes memories sourced from it; revoking consent stops future writes and deletes saved memories.
- Include original orientation-specific interpretations and original pixel-art card faces for the 78-card tarot catalog. Record content and artwork provenance.
- Video calls (ADR-0015, ADR-0016): a one-to-one chat can open a call with a pixel-filtered 3D teller who speaks in their own locally synthesized voice, with lip sync and subtitles. The user talks (local speech recognition) or types in the call bar.
- The interface follows WhatsApp's layout (ADR-0019): a chat list with one row per teller or pair, named like contacts, beside the open chat on desktop and taking turns with it on phones; bubbles with tails and ticks, date pills, reading cards under the teller's message, and a You tab for memory, privacy and birth details. It uses a limited navy-and-gray palette with one gold accent, pixel fonts and pixel art.

Out of scope for the first release: tellers beyond Mira (tarot), Sage (I Ching) and Astra (astrology), hosted inference for anything but teller replies, multi-user accounts, and production deployment beyond the self-hosted single-user target.

## Stack direction

The project is local-first. Development and ordinary operation must not require a paid hosted-model API key. Initial development target: Windows 11 with an NVIDIA RTX 5080 (16 GB VRAM). This is a development machine target, not a production hardware guarantee.

| Layer | Direction |
|---|---|
| Frontend | TypeScript, React, Next.js App Router, and the OracleChat pixel design system (ADR-0019) defined from OpenSpec. Video calls render VRM models with three.js and `@pixiv/three-vrm`. |
| Backend | TypeScript and Express. |
| Orchestration | OpenAI Agents SDK for TypeScript. Application code controls teller ranking, response order, and group-chat sequencing. |
| Model execution | Ollama local endpoint by default for everything. Optionally, teller replies can come from a hosted OpenAI-compatible model configured in `.env`, with no fallback and memories shared only on a second opt-in (ADR-0014). |
| Data | Local PostgreSQL with pgvector; app-owned conversation and memory behavior. |
| Retrieval | Application-provided tarot draws, I Ching castings and natal charts with bundled original catalogs and recorded provenance. With a Brave key, a teller may look something up when current facts would help; only its short query is sent, and the sources are shown under its reply. Links the user pastes (up to two) are read by the app, never from the PC's own network, and given to the tellers (ADR-0012). |
| Observability | OpenTelemetry traces are primary. Langfuse and/or LangSmith are optional where useful. Do not export local-first run content to OpenAI tracing by default. |
| Evaluation | No OpenAI Evals product. Use acceptance tests and trace review. |

The first deployment target is self-hosted and single-user. The production inference host remains a later deployment decision. The baseline path must not require an OpenAI API key. Resolve the existing Zod v3 to Zod v4 compatibility boundary when integrating the Agents SDK.

## Delivery approach

Build in dependency order using spec-driven TDD. For each behavior, update or cite its OpenSpec requirement, write a failing acceptance test first, implement the smallest change, then refactor and rerun focused checks. See [milestones](milestones.md).

## Decision records

Durable product and architecture decisions are recorded in [`docs/adr/`](adr/README.md). OpenSpec defines Oracle behavior; review relevant Accepted ADRs before implementation and run the ADR alignment check at each milestone boundary.
