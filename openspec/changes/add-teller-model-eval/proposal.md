## Intent

Compare teller replies from the local Qwen model and the hosted OpenAI model on a fixed set of prompts, so the owner can decide whether hosted replies are worth turning on and catch regressions when prompts or models change.

ADRs reviewed: ADR-0002, ADR-0004, ADR-0008, ADR-0012, ADR-0013, ADR-0014, ADR-0017, ADR-0018, ADR-0022

## Why

Hosted replies (ADR-0014) work now, but nothing measures whether they behave better or worse than local ones on what matters in this app:
- Does the teller interpret the app-owned draw instead of inventing cards?
- Does it stay in character?
- In pair chats, does the right teller give the reading while the other doesn't make one up?

## What changes

- **Prompt set.** 24 cases cover Mira (tarot), Sage (I Ching) and Astra (astrology), alone and in pairs: readings, small talk, follow-ups on an earlier reading, and named, unnamed and "both of you" requests.
- **Runner.** `pnpm --filter @oracle/agent eval:models` runs every case through the real `ChatService` twice:
  - once with local Qwen replies and once with the hosted model;
  - routing stays local and is computed once per turn, then reused, so both arms see the same routes;
  - fans and coin tosses are picked and revealed the way a user would.
- **Checks.** Deterministic per-reply checks:
  - used the app-owned draw;
  - invented no card, hexagram or placement;
  - in character (no AI or "the user" talk, no speaking as another teller);
  - right teller read in pair chats.

  Results are written as JSON plus a Markdown summary, with every transcript for manual review.
- **Not in `pnpm test`.** The eval needs Ollama and the hosted key and costs money, so it runs only on demand. The checks themselves are unit-tested in `pnpm test`.

## Non-goals

- An LLM judge. Quality beyond the deterministic checks is reviewed by reading the transcripts.
- The OpenAI Evals product (ADR-0004, ADR-0022).
- Testing routing quality. Routing is local in both arms; the eval reports which teller it picked.
