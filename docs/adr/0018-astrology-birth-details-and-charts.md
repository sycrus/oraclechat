# ADR-0018: Astrology from consented birth details and an app-computed chart

**Status:** Accepted
**Date:** 2026-11-23
**Supersedes:** None (fills in the astrology decisions ADR-0013 deferred; extends ADR-0017's catalog with a form kind)

## Context

ADR-0013 makes astrology the next discipline and requires every discipline to have an application-owned reading method. Unlike a tarot draw or an I Ching casting, a chart depends on facts about the user: their birth date, time and place. ADR-0013 left four questions to this decision: what inputs are needed, how they are stored and consented to, how a place becomes coordinates and a time zone, and how the chart is computed. The owner chose a natal chart with transits, a saved, consented profile, an offline city list and Astra as the teller.

Related constraints: Oracle is local-first (ADR-0002) and single-user (ADR-0007). Saved memories need opt-in, and a second opt-in before they reach a hosted model (ADR-0009, ADR-0014). Interactive message kinds are a closed, app-owned catalog (ADR-0017).

## Decision

- **Inputs.** A birth date, a birth time to the minute and a birth place are all required. Readings with an unknown birth time are out of scope until a later change.
- **One saved, consented profile.** The details are stored locally in PostgreSQL as one profile for the local user. They are saved only by a request that carries explicit consent, and the owner can view, change and delete them. This consent is separate from memory consent. The details are never memory items and never go to memory extraction.
- **Offline places.** Places come from a bundled extract of GeoNames `cities15000` (CC BY 4.0, attributed in the UI): name, region, country, coordinates and IANA time zone. Lookup runs in-process with no network call. Free-text places and network geocoding are not used.
- **Time zones.** Local birth time becomes UTC through the runtime's IANA time zone data for the birth date. An ambiguous time uses the earlier occurrence, a nonexistent time moves forward by the gap, and the reading notes either case.
- **Ephemeris.** Positions come from `astronomy-engine` (MIT, pure TypeScript, about one arcminute accuracy), computed in-process. The Swiss Ephemeris was rejected because its AGPL/commercial licensing and native data files don't suit an MIT-style local bundle.
- **Chart model.** The zodiac is tropical. The chart has the Sun to Pluto, the ascendant and the midheaven, whole-sign houses, and conjunction, sextile, square, trine and opposition with fixed orbs. Transits come from Mars and the outer planets to natal points within 2°. Whole-sign houses work at every latitude, where Placidus fails near the poles.
- **What tellers receive.** A teller receives the computed chart and catalog meanings, never the date, time or place. Exact degrees can reveal the birth moment, so with hosted replies (ADR-0014) degrees and orbs are left out unless *Share saved details with the hosted model* is on. The saved and displayed chart is always complete.
- **Form kind.** When birth details are missing, the chat lays out an app-owned `birth-details` message kind (ADR-0017). Submitting it is a typed interaction that saves the profile and produces the reading. It is not a user message and not memory input. It is still allowed under ADR-0017: the user states facts about themselves, and the app computes the result from them. The user never picks the result. Calls never show the form.

## Consequences

- The first discipline that stores personal facts outside memory. Deleting the profile removes it, but readings already given keep their charts, like any reading.
- Bundling the place list adds about 3 MB of committed data (34k cities), and the list must be regenerated to pick up GeoNames updates.
- Historical time zone accuracy depends on the runtime's ICU data. Births before standard time zones existed (local mean time) may shift the ascendant.
- Hosted users without sharing get less precise readings, in exchange for not revealing their birth moment.

## Validation

- Chart tests compare computed longitudes and the ascendant against reference charts within stated tolerances, and cover DST, ambiguous times and high latitudes.
- Tests show that teller input never contains the birth date, time or place, and that hosted input without sharing has no degrees.
- Tests show that profiles are saved only with consent, are deleted on request, and never reach memory extraction. Spans carry no birth data.
- Place lookup tests run with network access stubbed to fail. `pnpm adr:check` passes.
