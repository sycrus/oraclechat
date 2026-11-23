## 1. HTTP health seam (TDD)

- [x] 1.1 Add a failing public-HTTP test for `GET /health` returning status 200 and `{"status":"ok"}`.
- [x] 1.2 Add the minimal Express app and health route; rerun the focused test.
- [x] 1.3 Add the executable server entry point and shutdown handling.

## 2. Agents SDK local provider seam (TDD)

- [x] 2.1 Add a failing test that runs an agent against a fake loopback OpenAI-compatible endpoint without `OPENAI_API_KEY`.
- [x] 2.2 Add the Agents SDK and Zod v4 dependencies; configure the local provider and make the test pass.
- [x] 2.3 Add a failing test that local-provider errors do not trigger a hosted fallback; implement the minimal behavior.
- [x] 2.4 Add a local model smoke command and document required Ollama environment variables.

## 3. Tracing (TDD)

- [x] 3.1 Add a failing test for a model-run OTel span with no prompt, user message, memory, or output attributes.
- [x] 3.2 Add privacy-filtered OTel instrumentation and disable Agents SDK OpenAI trace export; rerun the focused test.
- [x] 3.3 Verify optional Langfuse export configuration remains opt-in and no Evals dependency is introduced.

## 4. Verification and ADR alignment

- [x] 4.1 Run focused agent tests, `pnpm adr:check`, agent build, and agent lint.
- [x] 4.2 Run a real Ollama smoke request with the locally installed `qwen3.5:9b` model and verify local mode does not require an OpenAI API key.
- [x] 4.3 Install local PostgreSQL 16/pgvector in the existing Ubuntu WSL2 distro and verify the database-backed app can connect.
- [x] 4.4 Confirm proposal and design cite the same Accepted ADRs and comply with them.
