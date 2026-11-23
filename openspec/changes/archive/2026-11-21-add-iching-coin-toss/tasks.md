# Tasks

## 1. Backend: the toss kind, test-first

- [x] 1.1 Write `backend/agent/tests/iching/toss.test.ts` (new, failing): `drawToss` returns a casting toss with six hidden values and no public lines; `completeToss` on six lines equals the same reading `castIChing` rules produce (primary King Wen number, relating only with changing lines); toss state and validation errors. Run: must fail (module missing).
- [x] 1.2 Implement `backend/agent/src/iching/toss.ts` (`drawToss`, `completeToss`, `TossInteraction`, `PublicToss`), factoring the reading-forming math shared with `castIChing`. Rerun: pass.
- [x] 1.3 Write the failing schema tests in `backend/agent/tests/tellers/schema.test.ts`: coin toss on a tarot teller rejected; toss without invitation rejected; a valid I Ching definition with a toss accepted. Run: fail. Then add the `toss` field + `superRefine` rule to `backend/agent/src/tellers/schema.ts`. Rerun: pass.

## 2. Backend: chat integration, test-first

- [x] 2.1 Write the failing turn test: a toss-enabled I Ching teller asked for a reading in chat lays out a coin-toss message (invitation text saved, public payload carries no unthrown values, an earlier open toss of the same teller is set aside); an I Ching teller without the toss still casts immediately. Run: fail.
- [x] 2.2 Extend `chat/interaction.ts`: the `Interaction`/`PublicInteraction` union gains the toss (public view strips `remaining`), `InteractionRequest` gains `{ action: "toss"; after: number }` with validation. Write the failing `applyInteraction` tests: toss reveals exactly one pre-cast line bottom-up; `after` mismatch rejected with no change; repeated toss idempotent; sixth toss sets revealed, saves the reading (primary/relating per rules) on the message and streams the teller's interpretation receiving the exact cast plus the user-cast note; a failed interpretation keeps the cast revealed; toss interactions never become user messages or memory input. Run: fail.
- [x] 2.3 Implement in `chat/service.ts`: extract the kind-agnostic set-aside sweep from `layOutFan`; add `layOutToss`; add the toss branch in `applyInteraction` (with the compare-and-set completion); widen `dealt`; extend `readingContext` for a user-cast I Ching reading. Gate in `runTurn`: `teller.toss` lays out the toss for chat reading turns. Rerun 2.1–2.3: pass.
- [x] 2.4 Add the `toss` invitation to `backend/agent/src/tellers/definitions/sage.yaml`; confirm the definitions tests pass (they load real YAML).

## 3. Frontend, test-first

- [x] 3.1 Write `frontend/app/src/lib/toss.test.ts` (failing): `parseTossInteraction` accepts a casting toss with well-formed lines and rejects unknown states, wrong line counts, malformed lines; `coinFaces` maps each value to its unique three-coin faces; `lineLabel` describes place and state. Run: fail.
- [x] 3.2 Implement `frontend/app/src/lib/toss.ts`. Rerun: pass.
- [x] 3.3 Write the `CoinToss` render test (failing, static-markup style): six slots bottom-up, tossed lines solid/broken with changing marked, toss control labelled with the count and disabled when complete, set-aside note, reduced-motion class. Run: fail.
- [x] 3.4 Implement `frontend/app/src/app/CoinToss.tsx` + CSS. Rerun: pass.
- [x] 3.5 Wire into `chat-workspace.tsx`: parse `parseTossInteraction`, render `CoinToss` with the `interact` toss action, revealed casts render via the existing reading view. Rerun frontend tests: pass.

## 4. Full verification

- [x] 4.1 Run `pnpm test` and `pnpm lint` (include `pnpm adr:check`): all green.
- [x] 4.2 Live check: rebuilt backend, restarted the stack; in the real app asked Sage for a reading → his invitation and six empty slots appeared; six tosses built the cast (hexagram 17, Sui, with two changing lines) and revealed the reading with its relating hexagram (24, Fu), after which Sage's interpretation streamed, acknowledging the user's cast and closing with a question. Mid-cast resume, set-aside, Mira's fan, and Sage's immediate call castings are covered by the automated tests.

## 5. ADR alignment check

- [x] 5.1 Confirm ADR-0017/0013/0012/0002/0004 compliance as recorded in design.md; no ADR changes needed. `pnpm adr:check` passes (covered by 4.1).
