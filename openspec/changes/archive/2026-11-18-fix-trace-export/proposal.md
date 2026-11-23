## Intent

Make configured Langfuse trace export actually deliver Oracle's privacy-filtered OpenTelemetry spans.

## Why now

With Langfuse Cloud configured, no spans arrive. The OTLP HTTP exporter (`@opentelemetry/exporter-trace-otlp-http` 0.215, SDK 2.x span shape) is paired with `@opentelemetry/sdk-node` 0.53 / `sdk-trace-base` 1.30 spans. Serializing every span throws `Cannot read properties of undefined (reading 'name')`, so all exports fail silently. The startup log also always claims "console exporter".

## What changes

- Align the OTLP exporter with the installed OpenTelemetry SDK line so spans serialize.
- Report the selected exporter accurately at startup.
- Add a regression test that exports a real span through the configured OTLP exporter.

## Non-goals

- Changing span names, attributes, or privacy filtering.
- Upgrading the whole OpenTelemetry SDK to 2.x.

ADRs reviewed: ADR-0002, ADR-0004
