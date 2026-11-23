## Tasks

### 1. Span structure (TDD)
- [x] 1.1 Failing ChatService tracing test: a group turn has one `oracle.chat.turn` root span with `langfuse.session.id`, and rank, participation, two teller-reply and memory spans beneath it.
- [x] 1.2 Add the turn root, `oracle.teller.reply` and `oracle.memory.extract` spans.
- [x] 1.3 Failing test: the ranker's model call is a child of `oracle.orchestration.rank`. Move the call inside the span.

### 2. Generations and export (TDD)
- [x] 2.1 Failing test: agent-run spans carry `gen_ai.request.model`, `gen_ai.system` and the generation type, and no fixture content appears in any attribute. Implement, adding token usage when the SDK exposes it.
- [x] 2.2 Failing test: `buildExporter` pairs Langfuse with a batch processor and the console with a simple processor. Implement, and confirm shutdown flushes.
- [x] 2.3 Remove `langfuse.client.ts` and the `langfuse` dependency.

### 3. Verification and alignment
- [x] 3.1 Run two live turns in one conversation and confirm in Langfuse Cloud: one trace per turn, a shared session, nested generations with the model name, and no content. (Verified 2026-11-18 via `GET /api/public/v2/observations`: 2 traces sharing the session, each with an `oracle.chat.turn` root and 8 observations; 3 GENERATIONs per turn with model `qwen3.5:9b` and token usage; no message text found.)
- [x] 3.2 Check ADR alignment; run `pnpm test`, `pnpm lint` and `graphify update .`.
- [x] 3.3 Turn off resource auto-detection (host, OS user, process paths). Verified live 2026-11-18: Langfuse metadata shows only service.name and telemetry.sdk.*.
