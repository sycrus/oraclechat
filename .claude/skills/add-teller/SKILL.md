---
name: add-teller
description: Add a new fortune teller (or a new discipline for one) to Oracle — YAML definition, discipline wiring, router cases, chat roster, avatar art, 3D call model and voice, docs. Use when the user says "add a teller", "new teller", names a new character for the roster, or wants to give an existing teller a call avatar/voice. Runs inside the oracle-change workflow.
---

# Add a teller

Done four times so far (Sage's call avatar, Astra, Sage's I Ching, Milo); this is the checklist those changes converged on. **Run it inside `oracle-change`**: create the OpenSpec change first (e.g. `add-<discipline>-teller`), then use the sections below as the test-first tasks. Use `openspec/changes/archive/2026-11-23-add-astrology-teller/` and `openspec/changes/add-workplace-reflection-teller/` as worked examples.

Run `graphify query "<teller or discipline question>"` before reading source.

## 0. Ask the owner (one AskUserQuestion, skip what they already said)

- Name, id (`<name>-the-<role>`, kebab-case), gender, one-line roster detail ("Practical · work styles, team culture").
- Discipline: an existing value in `DISCIPLINES` (`backend/agent/src/tellers/schema.ts`) or a new one. ADR-0013 says **one discipline per teller with an app-owned method**, so a new discipline needs an app-owned reading/tool (a draw, casting, computed chart, or a closed enum of prompts like Milo's `workplaceTool`). The model never authors the draw or the UI (ADR-0017).
- Callable? If yes: which VRM (default source: [PolygonalMind/100Avatars](https://github.com/PolygonalMind/100Avatars), CC BY 4.0) and a voice description for OmniVoice (`"male, young adult, low pitch, british accent"`).

**Gate:** a new discipline usually needs a new ADR (Astra → ADR-0018). Raise that before design.

## 1. Specs (in the change)

Delta for `openspec/specs/tellers/spec.md` (roster, packaged definitions), plus `chat` (supported disciplines/conversations), `voice-calls` (if callable), and the discipline's own capability (e.g. `astrology`, `iching`) when new. Update any "Deferred capabilities" paragraph that lists this discipline as deferred. Confirm `## Requirements` headings exist.

## 2. Backend definition — test first

Files: `backend/agent/src/tellers/schema.ts`, `backend/agent/src/tellers/definitions/<name>.yaml`, tests in `backend/agent/tests/tellers/`.

1. Failing tests:
   - `definitions.test.ts`: roster expects the new teller; if callable, `call` equals `{ voice: "<name>" }`.
   - `schema.test.ts`: any new discipline-specific field accepted for this discipline and rejected for others (pattern: Astra's `birthDetails.invitation` via `superRefine`).
2. Add the discipline to `DISCIPLINES` if new.
3. Write `<name>.yaml` modeled on `milo.yaml`: `id`, `displayName`, `avatar: /tellers/<name>/<name>.vrm`, `discipline`, `gender`, `personality` (voice, humor, emotionalRegister, reframingStyle), `lifeContext`, `activationProfile` (topics, emotionalTones, situations), `relationships` (to existing tellers), `readingLens`, `call.voice`, `systemPrompt`. Keep the tone lighthearted and constructive (openspec/config.yaml), and state in the prompt what the teller must never claim.
4. Rerun: pass.

## 3. Chat and routing — test first

Files: `backend/agent/src/chat/service.ts` (`SUPPORTED_DISCIPLINES`), `backend/agent/src/orchestration/router.ts`, tests `tests/chat/service.test.ts`, `tests/orchestration/router.test.ts`.

1. Failing `service.test.ts` cases: 1:1 conversation with the new teller created; a two-teller group with an existing teller created; three tellers still rejected. If the "unsupported discipline" case used this discipline, switch it to another still-deferred one (e.g. `numerology`).
2. Failing `router.test.ts` cases: a message naming the teller; a topic from its activation profile in a group; "can you both read for me?" in a group. For a tool-style discipline, add enum validation and "other tellers always get none" cases.
3. Add the discipline to `SUPPORTED_DISCIPLINES`; extend the router instructions and any normalization; implement the discipline's branch in `ChatService` (reading context, or the no-tool note).
4. Adjust the activation profile/router prompt until the router cases pass. Rerun: pass.

## 4. Frontend — test first

Files: `frontend/app/src/lib/tellers.ts` (`chatTellers`), `frontend/app/src/lib/profile-art.ts` (pixel emblem keyed by id), tests `lib/tellers.test.ts`, `app/avatar.test.tsx`, `app/call/call-overlay.test.tsx`.

1. Failing tests: roster includes the teller with `model: "/tellers/<name>/<name>.vrm"` (if callable); avatar renders its emblem; the call overlay offers it in a 1:1 chat.
2. Add the `chatTellers` entry in roster order and a `profile-art.ts` emblem using the existing `COLOURS` palette (ADR-0019 pixel design system). Rerun: pass.
3. A new reading UI is a new message kind in the app-owned catalog (ADR-0017) with its own parse test and component — scope it in the change, don't improvise.

## 5. Call assets (local only, gitignored)

Follow the **`teller-call-assets`** skill:
- download the VRM into the scratchpad and check it with `check-vrm.mjs`
- place it at `frontend/app/public/tellers/<name>/<name>.vrm`
- generate the voice with `make_voice.py`
- prove it with `voice-roundtrip.mjs <teller-id>`; the backend must be rebuilt first so it knows the new YAML

Make sure no assets are staged.

## 6. Docs

- `docs/operations.md` → "Video calls": add the teller to the list of callable tellers, add its `make_voice.py` line, and add its model source path.
- `docs/asset-attribution.md`: creator, source repository, license, the exact file, and any changes made to it.
- `docs/prd.md`: the roster sentence, the one-specialty paragraph, and the out-of-scope roster line.
- `README.md`: the roster and teller mentions.

## 7. Verify (oracle-change Phase 5)

- `pnpm test`, `pnpm lint`, `graphify update .`.
- Live check with the **`live-check`** skill: a 1:1 chat gives an in-character reply that uses the discipline's method. A group with an existing teller gets both replies. If callable, a call renders the model head-and-shoulders, it speaks, and its lips move. Stop the stack before any rebuild.
- ADR alignment, including ADR-0013, ADR-0015 and ADR-0017. Then the owner gate before archiving.
