## Tasks

### 1. Exporters (TDD)
- [x] 1.1 Failing tests for `buildExporters`: both, Langfuse only, LangSmith only, neither (console); remote exporters are batched.
- [x] 1.2 Failing test: a fake LangSmith server receives a span at `/otel/v1/traces` with `x-api-key` and `Langsmith-Project`, and a custom endpoint is honoured.
- [x] 1.3 Implement `buildExporters`, wire every processor into `NodeSDK`, log the active exporters, and document the variables in `.env.example`.

### 2. Attributes (TDD)
- [x] 2.1 Failing tests: the turn root has `langsmith.metadata.thread_id` and kind `chain`, and model-call spans have kind `llm`. Implement.

### 3. Verification and alignment
- [x] 3.1 With a real LangSmith key, run a live turn and confirm the run tree, thread, model and token usage, with no content. (Verified 2026-11-18: chain root with `thread_id` = conversation, nested `llm` run with model `qwen3.5:9b` and token usage, no content. The first attempt found that `langsmith.trace.session_id` is a project ID; using it caused 404s, so it was switched to `langsmith.metadata.thread_id`.)
- [x] 3.2 Check ADR alignment; run `pnpm test`, `pnpm lint` and `graphify update .`.
