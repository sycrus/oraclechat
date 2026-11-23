## Context

`ChatService.sendMessage` draws one spread, then for each responder builds `instructions` from `systemPrompt` plus a relationship sentence. `input` is the history plus the spread JSON. The definition schema (`tellers/schema.ts`) has `personality` and `lifeContext`, but no code reads them. `drawSpread` shuffles the 78-card catalog and takes the first N cards.

## Decision

- **Schema.** Add a required `signatureCard: { position: "action" | "shadow"; lens: string }` to the teller definition. The positions are a closed enum, so the frontend can label and validate them. A future teller adds a position deliberately.
- **Draw.** `drawSignatureCards(spread, positions, random)` in `tarot/draw.ts` shuffles the deck minus the spread's cards and returns one `TarotCardDraw` per position, with orientation and the orientation-specific meaning, all distinct. `drawSpread` is unchanged. `ChatService` draws signature cards for the selected responders once per turn, after selection.
- **Instructions.** A pure `buildTellerInstructions(teller, registry)` in `tellers/instructions.ts` composes: `systemPrompt`, a persona block (voice, humor, emotional register, reframing style, life context), the signature lens, and relationships, followed by the existing "respond as yourself" line. `ChatService` uses it in place of its inline string.
- **Input.** After the shared draw JSON, the teller input adds `Your signature <position> card (drawn by the application for you only; interpret it without changing it): <card JSON>`.
- **Persistence and events.** `ChatMessage.signatureCard?: TarotCardDraw` is stored in a new nullable `signature_card JSONB` column (added with `ADD COLUMN IF NOT EXISTS`, like `reading`). `message_start` carries `card`. The persisted message returned by `message_complete` includes it.
- **UI.** `parseSignatureCard` in `lib/tarot.ts` validates the card, and the workspace renders one small card, labeled "Action card" or "Shadow card", above the teller's bubbles. Click-to-expand works as it does for spread cards.

Rejected:
- A model-callable draw tool. Local `qwen3.5:9b` tool calling is unreliable, and an app-owned draw keeps the spec guarantee that tellers never draw cards themselves (ADR-0002).
- A different spread per teller. It breaks the shared reading the user sees and doubles the cards on screen.

## Verification

Test-first:
- Schema rejects a definition without `signatureCard`, and both MVP definitions carry distinct positions.
- `drawSignatureCards` returns distinct cards that are not in the spread, with orientation-correct meanings.
- `buildTellerInstructions` includes the persona fields, life context, lens and relationship.
- `ChatService` gives each teller its own card in the input, emits it on `message_start`, and persists it.
- The store round-trips `signatureCard`.
- `parseSignatureCard` accepts valid cards and rejects malformed ones.

Then run a live group turn.

## ADR alignment

- ADR-0002: the draw stays an app-owned capability, and no Responses-only or hosted tools are used.
- ADR-0003: application code still owns selection, ordering and draws. Each reply stays attributed.
- ADR-0004: no card names or prompt content are added to spans.
- ADR-0001, ADR-0005, ADR-0007 and ADR-0008: the change stays tarot-only and single-user, with original catalog content and both tellers responding. No ADR is superseded. The changed guarantee ("every teller receives the same draw") lives in the tarot spec, which this change updates.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0007, ADR-0008
