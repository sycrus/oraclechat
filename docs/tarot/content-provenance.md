# Tarot content provenance

Oracle's card interpretations are original product copy authored for this project. The 78 card titles and the four-suit structure use traditional tarot naming; the upright and reversed descriptions do not reproduce a third-party guidebook.

Each card has separate upright and reversed text in `backend/agent/src/tarot/catalog.ts`. The draw service selects the matching description and passes it with the card to the teller and inline card renderer. The same module records the content and artwork provenance metadata consumed by tests.

The card faces are original 24×36 pixel art drawn in code in `frontend/app/src/lib/pixel-tarot.ts` and rendered by `frontend/app/src/app/tarot-artwork.tsx`, the same in the chat and in video calls. They are authored for Oracle, not scans or copies of published decks. Each Major Arcana card is a dark card with one recognisable symbol (a skull for Death, a lightning-struck tower, a single star over water); number cards show their count of pixel cups, swords, wands or pentacles on a card bordered in the suit's colour; court cards show a large suit symbol under a cap, helmet or crown. The face-down card back in Mira's fan is drawn in `frontend/app/src/app/card-fan.tsx`. Colours come from the OracleChat call palette (ADR-0019).

## Review notes

- Interpretations are reflective prompts, not predictions or professional advice.
- Card-name and suit terminology follows the established tarot vocabulary.
- No external meaning text or card-image source is embedded in the MVP catalog.
- Editorial revisions should update the provenance metadata and preserve both orientation variants for every card.
