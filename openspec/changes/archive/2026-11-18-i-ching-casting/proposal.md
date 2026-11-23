## Intent

Let the user ask for an I Ching casting for a message, interpreted by the tellers already in the chat.

## Why now

Additional disciplines are the first deferred item in milestone 5 that fits the current ADRs: the casting is app-owned and local, like a tarot draw. The I Ching is the user's chosen first discipline.

## What changes

- **New divination option "I Ching".** The composer's menu gains *I Ching casting*; the API accepts `spread: "i-ching"`.
- **Casting.** The app casts six lines, bottom to top, with the three-coin method (6 old yin and 9 old yang are changing; 7 and 8 are stable). Probabilities are 1/8, 3/8, 3/8, 1/8. Lines map to one of the 64 hexagrams by their trigrams (King Wen order). Changing lines produce a second, relating hexagram.
- **Content.** A bundled catalog of original Oracle wording for all 64 hexagrams (name, short meaning), with provenance recorded. Hexagram names are traditional; the meanings are original.
- **Interpretation.** Both tellers receive the same immutable casting. No signature cards are drawn for an I Ching casting.
- **Rendering.** The frontend validates the casting and shows the primary hexagram as six drawn lines, marks changing lines, and shows the relating hexagram when present.
- **Persistence.** The casting is stored as the user message's `reading`, like a tarot spread.

## Non-goals

- A dedicated I Ching teller or persona (the existing tellers interpret the casting).
- Traditional line texts or any translation of a published edition.
- Yarrow-stalk probabilities, coin animations, or user-entered lines.
- Other disciplines.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008
