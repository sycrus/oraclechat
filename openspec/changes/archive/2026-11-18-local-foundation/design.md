# Local runtime foundation design

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007

## Design

- Add a small Express application with a public `GET /health` route.
- Add an agent runtime module that constructs an Agents SDK `Runner` with an explicit local `OpenAIProvider` (`baseURL` from `OLLAMA_BASE_URL`, Chat Completions mode, and a non-secret local placeholder key). Use the configured model name. There is no fallback to OpenAI.
- Use the Agents SDK's `tracingDisabled` option and application-owned OTel spans so prompts and outputs do not go to the SDK's OpenAI trace exporter. Keep the existing optional OTel-to-Langfuse exporter.
- Add a smoke command that makes one prompt call to the configured local model and prints only the returned text to the invoking terminal.

## TDD seams

- HTTP seam: `GET /health`, exercised with an ephemeral local HTTP server; verifies status/body but not server internals.
- Provider seam: an Agents SDK run against a fake OpenAI-compatible HTTP server bound to loopback; verifies the local path, response parsing, and no hosted fallback without requiring Ollama or external network. A separate smoke command verifies the real local model when Ollama and a model are available.
- Trace seam: inspect exported OTel spans using an in-memory exporter; verifies a run span exists and private content is absent. It does not test exporter delivery to Langfuse.

## TDD approach

Write one failing health test, implement the route, then add the fake-local-provider run test and implement the runner/provider seam. Add a trace privacy test before configuring run spans. Keep the real Ollama call as a manual smoke check because it depends on the user's installed model/runtime.

## ADR alignment

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007

- The local endpoint default and explicit no-fallback behavior follow ADR-0002 and ADR-0007.
- The Agents SDK with app-owned runtime wiring follows ADR-0003.
- OTel remains primary and the SDK's default OpenAI trace export is disabled, following ADR-0004.
- The change stays within Oracle's OpenSpec boundary under ADR-0001.
