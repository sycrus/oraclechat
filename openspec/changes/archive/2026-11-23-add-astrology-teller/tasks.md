# Tasks

## 1. Setup

- [x] 1.1 Get the owner's acceptance of ADR-0018 (Proposed → Accepted, index updated); verify `pnpm adr:check` passes.
- [x] 1.2 Add `astronomy-engine@2.1.19` to `backend/agent` with `pnpm add`; verify `pnpm --filter @oracle/agent lint` still passes.
- [x] 1.3 Write `scripts/build-places.mjs` (GeoNames `cities15000` + `admin1CodesASCII` + `countryInfo` → `backend/agent/data/places.json`), run it, commit the output with a `data/places.provenance.md` (CC BY 4.0 attribution, download date); it is read from `backend/agent/data/` by `src` and `dist` alike; verify it has ~34k rows.

## 2. Chart computation, test-first

- [x] 2.1 Write failing `backend/agent/tests/astrology/time.test.ts`: New York 1990-07-01 12:00 → 16:00Z; an ambiguous fall-back time takes the earlier instant with note `ambiguous`; a spring-forward gap moves forward with note `skipped`. Implement `astrology/time.ts`; rerun: pass.
- [x] 2.2 Write failing `tests/astrology/chart.test.ts` with fixtures for a documented reference chart (source recorded in the fixture): planet longitudes within 0.1° (Moon 0.3°), ascendant within 0.5°, retrograde flags; whole-sign house numbering; a Tromsø birth gives every planet a house; aspect at 92° = square orb 2°, 67° = none; same details on two dates → identical natal, different transits, transits sorted by orb ≤ 2°. Implement `ephemeris.ts` and `chart.ts`; rerun: pass.
- [x] 2.3 Write failing `tests/astrology/catalog.test.ts` (10 planets, 12 signs, 12 houses, 5 aspects, each named with a meaning). Write `catalog.ts` with original Oracle text and its provenance constant (as `iching/hexagrams.ts` does); rerun: pass.
- [x] 2.4 Write failing `tests/astrology/teller-view.test.ts`: precise view has degrees and orbs; coarse view has signs/houses/retrograde/aspect names and no digits for degrees or orbs; neither contains a date, time, place name or coordinate. Implement `teller-view.ts`; rerun: pass.

## 3. Birth details, test-first

- [x] 3.1 Write failing `tests/astrology/places.test.ts` (fetch stubbed to throw): "san fr" finds San Francisco with America/Los_Angeles; "springfield" results each carry region and country; limit 10, population order. Implement `places.ts` (lazy load); rerun: pass.
- [x] 3.2 Write failing `tests/astrology/details.test.ts` + `profile-store.test.ts` (pg-mem): 1990-02-30, future dates, pre-1800, `24:00` and unknown `placeId` rejected; save requires `consent: true`; save survives a new store instance; update and delete; rejected save leaves the old profile. Implement `details.ts` and `profile-store.ts`; rerun: pass.
- [x] 3.3 Write failing route tests in `tests/server/birth-details.test.ts`: `GET /api/places`, `GET/PUT/DELETE /api/birth-details` (400 without consent, 400 for invalid fields, no memory created with memory consent off). Add the routes to `server/app.ts`; rerun: pass.

## 4. Teller definition, test-first

- [x] 4.1 Write failing schema tests in `tests/tellers/schema.test.ts`: astrology teller without `birthDetails.invitation` rejected; tarot or I Ching teller with it rejected; valid astrology definition accepted. Add the field and `superRefine` rule to `tellers/schema.ts`; rerun: pass.
- [x] 4.2 Write `tellers/definitions/astra.yaml` (persona, activation profile, relationships, reading lens, system prompt, `birthDetails.invitation`, `call.voice: astra`); update the definitions/roster tests to expect Mira, Sage and Astra, each callable; rerun: pass.
- [x] 4.3 Add failing router cases in `tests/orchestration/router.test.ts` for "Astra, what's my chart saying?", "look at my transits" in an Astra+Mira group, and "can you both read for me?"; adjust the activation profile or router prompt until they pass.

## 5. Chat integration, test-first

- [x] 5.1 Change the `service.test.ts` unsupported-teller case to a `numerology` placeholder; add failing cases: Astra 1:1 and Astra+Mira/Sage conversations created, three tellers rejected. Add `astrology` to `SUPPORTED_DISCIPLINES`; rerun: pass.
- [x] 5.2 Write failing turn tests: with a saved profile Astra's reading is a chart saved on her reply and her input holds the precise view with no raw details; hosted replies without sharing → coarse view in her input and in Sage's reference input for Astra's reading; with sharing → precise. Implement the astrology branch of `drawFor`/`readingContext` and route `referenceContext` through `chartForTeller`; rerun: pass.
- [x] 5.3 Write failing tests in `tests/chat/birth-form-interactions.test.ts`: without a profile, a chat reading lays out a `birth-details` message with the invitation and no chart; an earlier open form is set aside; submit saves the profile, saves the chart on the form message and streams the interpretation; second submit → 409; invalid details → 400 with the form still open; no user message added and memory extraction not called; a call turn without a profile makes no form and no chart and gives the app note; spans carry no birth data. Implement `BirthFormInteraction`, the `submit` request, `layOutBirthForm` and the `applyInteraction` branch; rerun: pass.

## 6. Frontend, test-first

- [x] 6.1 Write failing `frontend/app/src/lib/astrology.test.ts`: valid chart parses; missing planet, degree ≥ 30, house 13 and unknown aspect point rejected; `placementLabel` gives "Moon in Cancer, 12°, 4th house". Implement `lib/astrology.ts`; rerun: pass.
- [x] 6.2 Write failing `chart-wheel.test.tsx` (static markup): 12 sign segments, ascendant at 9 o'clock, a glyph per planet, accessible placement/aspect/transit lists, invalid data renders nothing. Implement `chart-wheel.tsx` + CSS and dispatch it from `message-body.tsx`; rerun: pass.
- [x] 6.3 Write failing `birth-details-form.test.tsx` and `lib/birth-form.test.ts`: parse the `birth-details` kind (open/submitted/set-aside, unknown states rejected); form fields, combobox ARIA, consent required before submit, attribution shown, error kept on failure, set-aside form disabled. Implement the component, wire it inline in `chat-workspace.tsx` via `interact` and in the memory panel via the profile routes (view/change/delete); rerun: pass.
- [x] 6.4 Add Astra to `frontend/app/src/lib/tellers.ts` with her model path; update `tellers.test.ts`; rerun: pass.

## 7. Assets and docs

- [x] 7.1 Download 100Avatars Cosmic Person (`_129`) to `frontend/app/public/tellers/astra/astra.vrm` (gitignored) and record a reference clip for the `astra` voice; update `docs/operations.md` (assets, places data regeneration) and the PRD's speciality line; verify `git status` shows no `.vrm` or clip staged.
- [x] 7.2 Generate one sample sentence with Astra's voice and transcribe it with Whisper before claiming the voice works.

## 8. Full verification

- [x] 8.1 Run `pnpm test` and `pnpm lint` (includes `pnpm adr:check`): all green.
- [x] 8.2 Live check (rebuild with the stack stopped, never `pnpm build` under a running `next start`): ask Astra for a reading with no profile → form appears; submit → chart wheel, transits and interpretation; reload persists; delete details in the panel → next request shows the form; Astra+Mira group "can you both read for me?"; a call with Astra reads and shows "see chat"; note the place-list load time.

## 9. ADR alignment check

- [x] 9.1 Confirm compliance with ADR-0001/0002/0004/0007/0008/0009/0012/0013/0014/0015/0017/0018 as recorded in design.md; ADR-0018 is Accepted and indexed; `pnpm adr:check` passes.

## Workflow follow-up

- Before archive, add the missing `## Requirements` heading to `openspec/specs/tellers/spec.md` (it uses `---` instead, so archive refuses the tellers delta).

- On archive, sync specs and edit the "Deferred capabilities" paragraphs in `openspec/specs/chat/spec.md` and `openspec/specs/tellers/spec.md` so astrology is no longer listed as deferred.
- Archive the change after review.
