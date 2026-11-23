## Intent

Make the tellers act like friends in a group chat. You ask a teller for a reading and they give one in their own discipline. They decide for themselves when to look something up, and they read links you paste. The composer becomes a plain text box.

## Why now

The owner rejected the composer's *Cards* dropdown and *Search the web* box. Readings should be something you ask a teller for, and lookups should depend on the conversation. Each teller should have its own speciality.

## What changes

- **Composer** loses the *Cards* dropdown and the *Search the web* box. The API rejects `spread` and `search` with a 400.
- **Specialities.** Mira stays tarot. Sage becomes the I Ching reader, with a rewritten persona, prompt and lens, and no signature card.
- **Turn router.** The existing ranker call is extended, and now also runs in one-to-one chats. In one call per turn it scores tellers and decides, per teller, whether the user asked them for a reading (by name, or without naming anyone), which spread to use (tarot), and an optional search query. It no longer receives saved memories.
- **Readings.** A teller reads when named, or when unnamed and first in reply order. The app draws or casts; the reading and Mira's signature card are stored with that teller's reply and shown above it. Other tellers can react to it.
- **Lookups.** With a Brave key, a teller's query is searched and the results go to that teller, shown as its sources.
- **Links.** Up to two pasted `http(s)` links are fetched safely and given to all tellers.
- **ADR-0012** (Proposed) supersedes ADR-0011 and replaces the user-chosen draw described in the PRD and the tarot and I Ching specs.

## Non-goals

- Astrology or any new teller (later change; relates to #8).
- Several readings or searches per teller per turn, or a model-callable tool loop.
- Migrating old messages whose reading is stored on the user message (they still render as they are).
- Rendering JavaScript pages, reading PDFs or images, or link previews.
- Carrying search results or page text into later turns.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008, ADR-0009, ADR-0011, ADR-0012
