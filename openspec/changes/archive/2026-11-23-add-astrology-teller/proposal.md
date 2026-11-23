# Proposal

Add Astra, an astrology teller who reads the user's natal chart against today's sky, from consented, locally saved birth details and an app-computed chart.

## Why

ADR-0012 and ADR-0013 name astrology as the next discipline, and the roster has had a placeholder for it since the teller schema landed. Unlike tarot and the I Ching, astrology needs personal input: a birth date, time and place. So it needs its own decisions about how that input is collected, consented to and stored, and how charts are computed. ADR-0013 left those decisions to this change.

## What Changes

- **New teller, Astra** (`astra-the-astrologer`, female, discipline `astrology`). Her niche is timing, cycles and seasons of life. She has her own persona, activation profile and reading lens, uses the CC0 100Avatars Cosmic Person (`_129`) as her call avatar, and has a named call voice.
- **Birth details profile.** The user enters a birth date, a birth time and a birth place, chosen from a bundled offline city list, and explicitly agrees to save them. The details are saved locally once and reused for every reading. The user can view, change and delete them. If the user asks Astra for a reading before saving any, the chat shows an inline birth-details form instead of a reading.
- **App-computed chart.** For each reading the app computes the natal chart: Sun to Pluto by sign, degree and house, the ascendant and midheaven, whole-sign houses and major aspects. It also computes the transits active at reading time. Astra interprets the chart and cannot change it. No model and no web lookup ever produces chart data.
- **Original catalog.** Oracle's own short meanings for the 10 planets, 12 signs, 12 houses and 5 aspects, with provenance recorded.
- **Rendering.** A validated chart wheel and a list of active transits are shown with Astra's reply. Invalid data falls back to her prose.
- **Privacy rule.** Tellers receive only the computed chart, never the raw birth date, time or place. Hosted replies get signs and houses without degrees unless the owner has turned on hosted sharing (ADR-0014). Birth details are never sent to memory extraction.
- **Conversations.** Astra can be in a one-to-one chat or in a two-teller group with Mira or Sage.
- **New ADR-0018** records the decisions above: inputs, consent and storage, the offline place lookup, the ephemeris library and the house system.

## Capabilities

### New Capabilities
- `astrology`: app-owned natal and transit chart computation, the astrology catalog, chart validation and display, and readings with no saved details.
- `birth-details`: capturing birth details, consent, local storage, viewing and deleting them, offline place lookup, and the inline birth-details form.

### Modified Capabilities
- `chat`: conversations accept Astra in one-to-one and two-teller chats; astrology joins the supported disciplines; the "Deferred capabilities" list no longer names astrology.
- `tellers`: the roster gains Astra as the astrology teller, with her niche, packaged definition and call configuration.
- `voice-calls`: Astra is callable; how astrology readings work in a call.

## Non-goals

- Unknown or approximate birth times, rectification, and sun-sign-only readings.
- Other house systems (Placidus, Koch), the lunar nodes, Chiron, asteroids, sidereal or Vedic astrology, synastry, progressions and returns.
- More than one birth profile (charts for other people) or group chats with three tellers.
- Showing the chart wheel in the call overlay (calls point to the chat).
- Network geocoding, and keeping or showing birth details in traces or logs.

## Impact

- Backend: `backend/agent/src/astrology/` (new), a birth-details store and API routes, `chat/service.ts` (supported disciplines, reading dispatch, inline form kind), `chat/interaction.ts`, `tellers/schema.ts`, a new `definitions/astra.yaml`, and a bundled places dataset.
- Frontend: a chart renderer, the birth-details form (inline and in the memory/profile panel), roster entry in `frontend/app/src/lib/tellers.ts`.
- New dependency: `astronomy-engine` (MIT, pure TypeScript ephemeris). The places data is GeoNames `cities15000` (CC BY 4.0), with attribution.
- Assets out of git: `frontend/app/public/tellers/astra/astra.vrm` and the `astra` voice clip, documented in `docs/operations.md`.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0004, ADR-0007, ADR-0008, ADR-0009, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0017, ADR-0018
