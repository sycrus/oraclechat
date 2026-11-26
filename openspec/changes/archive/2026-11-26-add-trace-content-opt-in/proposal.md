## Intent

Let the owner see prompts and replies in traces while debugging, by turning it on in `.env`. Traces stay metadata-only by default.

## Why now

Local Langfuse now receives OracleChat's traces, but every Input and Output panel reads "undefined" because spans deliberately carry no content. The owner wants to see what a teller was asked and what it answered when debugging.

## What changes

- **Configuration.** `TRACE_CONTENT=1` (or `true`) turns content capture on. Unset or any other value keeps it off.
- **Model-call spans.** When it is on, each `oracle.agent.run` span records its input (the instructions and input text, as chat messages) in `langfuse.observation.input` and the reply in `langfuse.observation.output`. Other spans are unchanged.
- **Startup log.** The backend logs a warning at startup when content capture is on.
- **Docs.** `.env.example` and `docs/operations.md` explain the setting, and that every configured trace destination (including LangSmith) receives the content.

## Non-goals

- Choosing content capture per destination (for example Langfuse only, not LangSmith).
- Masking or redacting content.
- Content on spans other than model calls.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0004, ADR-0009, ADR-0010, ADR-0014
