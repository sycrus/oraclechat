---
name: oracle-change
description: Run an Oracle behavior change end to end the way this repo requires — OpenSpec change with the ADR review line, test-first tasks, implementation, live check, ADR alignment, full checks, sync and archive. Use whenever the user asks to add, change or fix Oracle behavior (a feature, a bug fix, a teller capability, a tracing/guardrail switch), or says "propose", "start a change", "finish/archive the change". Not for pure docs or tooling edits that change no behavior.
---

# Oracle change workflow

This wraps the generic OpenSpec skills (`openspec-propose`, `openspec-apply-change`, `openspec-sync-specs`, `openspec-archive-change`) with the rules in `AGENTS.md` and `docs/adr/README.md`. Follow the phases in order. Stop at each **gate** for the owner.

Throughout: run `graphify query "<question>"` before your first grep or source read (see AGENTS.md); use pnpm only.

**Calling the CLI:** OpenSpec is a pinned root devDependency (`@fission-ai/openspec@1.5.0`) and is not on PATH. Every `openspec …` below means
`OPENSPEC_TELEMETRY=0 pnpm exec openspec …` (Bash) or `$env:OPENSPEC_TELEMETRY='0'; pnpm exec openspec …` (PowerShell).
The variable turns off its PostHog usage telemetry, which otherwise leaves this PC and times out noisily.

## Phase 1 — Find or create the change

1. `openspec list --json`. If an active change in `openspec/changes/` already covers the request, continue it instead of creating another.
2. Otherwise pick a kebab-case name with a verb prefix (`add-`, `fix-`, `keep-`, `pace-`…) and run `openspec new change "<name>"`.
3. Bug fix: the change must add a regression scenario unless the behavior is already specified in `openspec/specs/`.

## Phase 2 — ADR review (before any design)

1. Read `docs/adr/README.md`. Read every **Accepted** ADR that could touch the change (product boundary 0001, local-first 0002, Agents SDK 0003, observability 0004/0022, single-user 0007, group replies 0008, memory 0009, production 0010, teller-led 0012, one discipline 0013, hosted 0014, calls 0015/0016/0020, readings catalog 0017, design system 0019, guardrails 0021 — check the index for newer ones).
2. Never cite a Superseded or Deprecated ADR; cite its replacement (`pnpm adr:check` fails otherwise).
3. Build one line, IDs sorted ascending, e.g.
   `ADRs reviewed: ADR-0001, ADR-0002, ADR-0013` (or `ADRs reviewed: none`).
   The **same line, byte for byte**, goes in `proposal.md` and in design.md's `## ADR alignment` section — `scripts/check-adrs.mjs` compares them.
4. If the change makes or alters a durable product/architecture decision, add a new ADR in the same change: copy `docs/adr/template.md` to `docs/adr/NNNN-kebab-title.md` (next free number), title `# ADR-NNNN: …`, `**Status:** Proposed`, sections Context/Decision/Consequences/Validation, add it to the README index, and add a task "Get the owner's acceptance of ADR-NNNN (Proposed → Accepted, index updated)". To change an Accepted ADR, supersede it — never edit it in place.

**Gate:** if a new ADR is needed or a design would contradict an Accepted ADR, tell the owner before writing the design.

## Phase 3 — Artifacts

Generate artifacts via `openspec status --change "<name>" --json` / `openspec instructions <artifact> --change "<name>" --json`, honoring `openspec/config.yaml` rules:

- **proposal.md** — one-sentence intent first, under 500 words, a `## Non-goals` section, the ADR line.
- **specs/<capability>/spec.md** — deltas against existing capabilities in `openspec/specs/` (`## ADDED|MODIFIED|REMOVED Requirements`). Every requirement has ≥1 `#### Scenario:` with GIVEN/WHEN/THEN; cover error paths and edge cases; no implementation details.
- **design.md** — Context, Decision, TDD and verification, then `## ADR alignment` with the ADR line and one bullet per ADR saying how the design complies or why it deviates (with the superseding ADR).
- **tasks.md** — use this skeleton, numbered checkboxes, test-first inside every section:

```markdown
## Tasks

### 1. <area> (TDD)
- [ ] 1.1 Write failing tests in `<path>.test.ts` for <scenarios>; observe the expected failures. Implement `<path>.ts`; rerun: pass.

### N. Docs
- [ ] N.1 Update `docs/operations.md` / `docs/prd.md` / `.env.example` / README where behavior or setup changed.

### N+1. Verification and alignment
- [ ] Live check: <what to do in the real app and what to see>.
- [ ] ADR alignment check against design.md; run `pnpm test` and `pnpm lint` (both include `pnpm adr:check`); run `graphify update .`.
```

Before finishing Phase 3:
- Check every main spec the deltas touch has a literal `## Requirements` heading (archive refuses the delta otherwise — this bit `tellers/spec.md` once). If missing, add a task to fix it.
- If the main spec has a "Deferred capabilities" paragraph that this change un-defers, add a task to edit it at sync time.
- Run `openspec validate "<name>"` and `pnpm adr:check`; fix until both pass.

**Gate:** show the owner the proposal summary and task list; wait for go-ahead before implementing.

## Phase 4 — Implement, test-first

For each task, in order:
1. Write the failing test. Run only that test (`pnpm --filter @oracle/agent exec vitest run <file>` or the frontend equivalent) and **observe the failure** — record it if surprising.
2. Write the smallest code that makes it pass; rerun.
3. Refactor if needed; rerun the focused suite.
4. Tick the checkbox in tasks.md; add a short italic note when something notable happened (e.g. `*(2026-11-26: …)*`).

Keep edits surgical (AGENTS.md §3). Never commit `.vrm`, `.vrma`, voice clips, `.env`, or `eval/results/`.

## Phase 5 — Verify

1. `pnpm test` and `pnpm lint` — all green. Report real output if not.
2. Run the live check from tasks.md against the real app, using the **`live-check`** skill (safe rebuild/restart, headless screenshots). For voices, use **`teller-call-assets`** (`voice-roundtrip.mjs`). Rules learned the hard way:
   - Never run `pnpm build` while `next start` is serving the same `.next`; stop the stack (`scripts/oracle-down.ps1`) first, rebuild, then `scripts/oracle-up.ps1`.
   - For calls, the TTS sidecar must be running (`pnpm tts`); verify a voice by generating a sentence and transcribing it with Whisper, not by assuming.
   - If a live check can't run here (no browser, no GPU), leave the box unticked and say exactly what remains for the owner.
3. `graphify update .`. If it fails (e.g. `Failed to canonicalize script path`), record the error in the task note and tell the owner — don't silently skip.

## Phase 6 — Sync and archive

**Gate:** only when the owner says the change is reviewed.
1. Re-check `## Requirements` headings in affected main specs.
2. `openspec archive "<name>" -y`. It validates the change, merges the deltas into `openspec/specs/` and moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`. If it refuses, fix the spec. Don't pass `--no-validate`. Then apply any "Deferred capabilities" edits and look over `git diff openspec/specs/`.
3. `pnpm adr:check` again. Commit only when asked; never push to a `public` branch.
