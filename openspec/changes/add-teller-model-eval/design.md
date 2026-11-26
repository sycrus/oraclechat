## Context

- `ChatService` (`chat/service.ts`) takes `route` and `stream` as options, so an eval can swap the reply model while keeping everything else real.
- Mira and Sage lay out an interactive fan or toss when asked for a reading. The reading is dealt on reveal or on the sixth toss (ADR-0017). Astra reads directly once birth details are saved (ADR-0018).
- `PostgresChatStore` runs on `pg-mem` in tests. Vitest is the only TypeScript runner in the package.

## Decision

- **Files.**
  - `src/eval/checks.ts`: pure check functions, compiled and unit-tested in `tests/eval/checks.test.ts`.
  - `eval/cases.ts`: the 24 cases.
  - `eval/compare-models.eval.ts`: the runner.
  - `vitest.eval.config.ts`: includes only `eval/**/*.eval.ts`.
  - `pnpm eval:models` runs that config. `pnpm test` never includes it.
- **Arms.** `local` streams through `streamLocalAgent` with the Ollama config. `hosted` streams through `createHostedStream(loadHostedModelConfig())`. The runner skips with a clear message when either Ollama or the hosted config is missing.
- **Routing.** One `routeTurn` call per case turn on the local model. The result is cached by case and turn and reused by the second arm, so differences come from the reply model only.
- **Interactions.** After each turn, an open fan gets the needed number of picks (first N indexes) and is revealed. A coin toss is tossed six times. Each case uses a fresh `pg-mem` store and an in-memory birth profile (fixed date, time and place).
- **Checks per teller reply** (`checkReply`):
  - **Draw use.** With a reading this turn, the reply must name at least one dealt item:
    - tarot: a dealt card name;
    - I Ching: the hexagram number, pinyin or gloss;
    - astrology: a natal placement with the right sign, or a transit's planet with its aspect.
  - **Invented items.** Card names from the full deck, hexagram names or numbers, and "<planet> in <sign>" claims that aren't in this turn's reading, an earlier reading in the conversation, or the user's own message. Majors are matched case-sensitively with their article ("The Tower") to limit false hits on plain words.
  - **Character.** No AI or assistant talk ("as an AI", "language model"), no "the user", and no line starting with another teller's name and a colon.
  - **Right teller (pairs).** The case lists which tellers should read. Each expected reader's reply carried a reading, and the others' didn't.
- **Output.** `eval/results/<timestamp>.json` (cases, routes, transcripts, checks) and `.md` (pass rates per arm and check, per-case table, failures with excerpts). The directory is git-ignored.
- **Tracing.** With `OPENAI_TRACES=1`, hosted-arm replies are traced to OpenAI as usual (ADR-0022), which gives traces to grade in the dashboard.

Rejected:
- **LLM-as-judge.** Using either model to judge itself or the other is biased, and it adds cost. The deterministic checks cover the app-specific failures, and the transcripts cover the rest.
- **Mocked routing.** It would hide how the real reading flow behaves. Caching real routes keeps the two arms comparable.

## Verification

Test-first in `tests/eval/checks.test.ts`:
- a tarot reply naming a dealt card passes, and one naming an undealt card is flagged;
- a no-reading reply naming a card from an earlier reading isn't flagged;
- the hexagram number, pinyin or gloss counts as use;
- a wrong "Sun in Leo" is flagged and a correct one counts as use;
- AI and "the user" talk and speaking-as-another-teller lines are flagged;
- right-teller checks pass and fail as expected.

Then run `pnpm --filter @oracle/agent eval:models` live and review the summary and transcripts.

## ADR alignment

- ADR-0004, ADR-0022: quality checks are ordinary automated code and trace review; no OpenAI Evals product is used. Hosted traces follow ADR-0022.
- ADR-0002, ADR-0014: routing stays local, and only hosted-arm teller replies go to the hosted provider. No memories are used (no memory service in the eval).
- ADR-0008, ADR-0012, ADR-0013, ADR-0017, ADR-0018: the eval drives the real `ChatService` flow (both tellers respond, readings on request, one discipline each, interactive fan and toss, app-computed chart) and checks replies against it. It changes none of it.

ADRs reviewed: ADR-0002, ADR-0004, ADR-0008, ADR-0012, ADR-0013, ADR-0014, ADR-0017, ADR-0018, ADR-0022
