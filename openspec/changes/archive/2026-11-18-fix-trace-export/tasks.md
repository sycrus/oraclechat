## Tasks

### 1. Trace export (TDD)
- [x] 1.1 Add a failing test that exports a span through the configured OTLP exporter to a local receiver.
- [x] 1.2 Align `@opentelemetry/exporter-trace-otlp-http` with the SDK 1.x line and expose `buildExporter(env)`.
- [x] 1.3 Log the active exporter accurately at startup.
- [x] 1.4 Verify a live chat turn appears in Langfuse Cloud.

### 2. Alignment
- [x] 2.1 Review ADR-0002 and ADR-0004; run `pnpm test` and `pnpm lint`.
