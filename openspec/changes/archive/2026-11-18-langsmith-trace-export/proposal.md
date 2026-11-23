## Intent

Add LangSmith as a second, optional trace destination next to Langfuse. Both receive the same privacy-filtered OpenTelemetry spans.

## Why now

The owner wants to compare Langfuse and LangSmith on real Oracle traces. ADR-0004 already names both as optional destinations, and `langfuse-trace-structure` gave spans a clean turn, teller and generation structure for either tool to read.

## What changes

- When `LANGSMITH_API_KEY` is set, spans are also exported over OTLP/HTTP to `<LANGSMITH_ENDPOINT>/otel/v1/traces` with the `x-api-key` and `Langsmith-Project` headers. The endpoint defaults to `https://api.smith.langchain.com` and the project to `oracle`. Export is batched.
- Langfuse and LangSmith can be enabled together, alone, or not at all; with neither, spans go to the console. Startup logs every active exporter.
- Spans gain LangSmith's attributes alongside Langfuse's: `langsmith.metadata.thread_id` on the turn root, `langsmith.span.kind = "chain"` on the turn and `"llm"` on model calls.
- `.env.example` documents the three LangSmith variables.

## Non-goals

- The LangSmith SDK, LangChain, prompt hub or evaluations.
- Exporting prompts, messages, memory or outputs (ADR-0004).
- Agent-based LangSmith workspaces (`Langsmith-Agent-Id`).

ADRs reviewed: ADR-0002, ADR-0004, ADR-0007
