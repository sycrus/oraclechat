## Context

`backend/agent` pins `@opentelemetry/sdk-node` ^0.53 and overrides `@opentelemetry/sdk-trace-base` to ^1.30 (SDK 1.x), but `@opentelemetry/exporter-trace-otlp-http` is ^0.215 (built for SDK 2.x). The 2.x transformer reads `span.instrumentationScope.name`; 1.x spans expose `instrumentationLibrary`, so serialization throws inside the exporter and the error is only visible with OpenTelemetry diagnostics enabled.

## Decision

Pin `@opentelemetry/exporter-trace-otlp-http` to the 0.53 line that matches `sdk-node` 0.53 and SDK 1.x. Move exporter selection into an exported `buildExporter(env)` so a test can export a real span to a local HTTP receiver, and log the active exporter name (`langfuse-otlp` or `console`).

Upgrading every OpenTelemetry package to 2.x was rejected for this fix: it is a larger migration with no behavior gain.

## Verification

A failing test exports a span through `buildExporter` to a local HTTP server and expects a successful export with the span name in the OTLP JSON body. Then a live chat turn is checked in Langfuse Cloud.

## ADR alignment

Complies with ADR-0004: OpenTelemetry stays the foundation and Langfuse remains an optional, separately configured destination; span attributes are unchanged, so privacy filtering is preserved. Complies with ADR-0002: no hosted model or OpenAI tracing is introduced.

ADRs reviewed: ADR-0002, ADR-0004
