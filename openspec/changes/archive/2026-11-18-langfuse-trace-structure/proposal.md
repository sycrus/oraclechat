## Intent

Make Oracle's Langfuse traces readable. One chat turn should appear as one trace, with nested spans for ranking, each teller reply and memory extraction. A conversation's turns should be grouped as a session, and model calls should be shown as generations with their model name. No prompt, message or reply content is exported.

## Why now

Since `fix-trace-export`, spans reach Langfuse Cloud, but every span arrives as its own root trace (issue #10). In the UI, a single group turn appears as five or more unrelated traces with no session and no model, so the traces can't be used for debugging.

## What changes

- **Root span per turn.** `ChatService.sendMessage` runs inside an `oracle.chat.turn` span, so the rank, participation, teller and memory spans nest under it. The span carries `langfuse.session.id` (the conversation UUID), the teller count and the spread type.
- **Teller reply spans.** Each teller reply gets an `oracle.teller.reply` span with the teller ID and signature-card position. Its model call nests inside it.
- **Generations.** `oracle.agent.run` spans carry `gen_ai.system`, `gen_ai.request.model` and the Langfuse generation type, plus token usage when the SDK reports it.
- **Rank span fix.** `oracle.orchestration.rank` wraps the ranker's model call instead of starting after it.
- **Batch export.** The Langfuse exporter uses a `BatchSpanProcessor`, and the console exporter keeps `SimpleSpanProcessor`.
- **Cleanup.** Remove the unused `observability/langfuse.client.ts` and the `langfuse` package dependency.

## Non-goals

- Exporting prompts, user messages, memory or model output to Langfuse, even optionally (ADR-0004).
- Langfuse prompt management, scores or evals.
- Self-hosting Langfuse.

ADRs reviewed: ADR-0002, ADR-0003, ADR-0004, ADR-0007
