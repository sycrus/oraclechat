# The I Ching consultation, as practiced

Grounding for the interactive coin-toss reading (`iching-coin-toss` OpenSpec change) and any future I Ching presentation work. This records how a real consultation with an I Ching diviner runs, so the app's interactive kind mirrors the ritual rather than inventing one. Interpretation itself stays grounded in the bundled I Ching knowledge base and each teller's `readingLens` (ADR-0013).

## The ritual, in order

1. **Formulate the question.** The querent brings a genuine, specific situation they are invested in, not trivia. A good diviner spends real time here: vague questions get vague readings. The question is often kept private — the diviner never needs to hear it; the coins respond to the asker's clarity of mind.
2. **The querent casts — not the diviner.** The ritual belongs to the person with the question. Three coins are thrown **six times**, building the hexagram one line at a time, **bottom to top**. Each throw of three coins sums to 6–9:
   - **7** — steady yang (solid line)
   - **8** — steady yin (broken line)
   - **9** — changing yang (solid line, in motion)
   - **6** — changing yin (broken line, in motion)

   The older yarrow-stalk method (50 stalks, split and counted in silence) takes minutes per line and turns the casting into meditation; coins won out in modern practice on time alone.
3. **The reading.** The diviner reads the formed hexagram (Judgment, Image), but the specific answer to the querent's situation lives in the **changing lines**: they mark where motion already exists, and they transform the first hexagram into a second one, the **relating hexagram** — where the movement is heading.
4. **Counsel, not prophecy.** Serious practitioners do not predict the future. They hold the hexagram up as a mirror of the querent's own dynamics, name what is stuck and what is already moving, and often close with a question to sit with rather than an instruction.

## What the tradition implies for the app

- **The user performs the tosses.** The interaction is the point: the app must not pre-cast silently and present a finished hexagram. The user's tosses are the ritual. (Consistent with ADR-0017: the app still owns the randomness — the user's toss selects among throws the app has already randomized and hidden; it never chooses values itself.)
- **Six beats, visible accumulation.** The hexagram builds line by line, bottom to top, each throw shown as it lands. Suspense is part of the practice. (The card fan chose the opposite grammar — face-down until picked; the traditional flow favors visible accumulation.)
- **Changing lines carry the answer.** The reveal should distinguish 6s and 9s from steady 7s and 8s — they are where Sage looks first.
- **Cast → reveal → interpret.** Sage interprets only after the hexagram is complete, exactly as a diviner reads only a finished cast. This matches ADR-0017's consequence that "the app still draws, but the reveal can follow the user's interaction."
- **The question comes first.** Already natural in chat: the user states their situation, Sage reflects it, then offers the coins.

## Existing app coverage

- Sage's `readingLens` and `systemPrompt` already encode the counsel-not-prophecy posture (interpret the cast; never recast; close with a question worth sitting with).
- The app-owned three-coins method, hexagram knowledge base, and relating-hexagram computation exist in the backend's I Ching module (ADR-0012, ADR-0013).
- The interactive catalog — hidden server state, typed interactions, idempotency, reload resume, prose fallback — exists from the tarot card fan (ADR-0017's first kind).
