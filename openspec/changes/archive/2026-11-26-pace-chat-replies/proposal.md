## Intent

Make teller replies in chat feel like a person texting: typing dots, then each paragraph bubble pops in whole after a believable, slightly random pause, instead of text pouring in word by word as fast as the model writes.

## Why now

With the local model, replies stream in faster than anyone could type, so the chat doesn't read as a conversation. The owner chose bubble-by-bubble reveals timed by the bubble's length plus random variation.

## What changes

- **Paced reveal (frontend only).** A live teller reply shows typing dots, then its first paragraph bubble whole; dots again, then the next bubble, until the reply is shown. Each pause scales with the bubble's length, with random variation, between 1 and 6 seconds. Pauses count from the previous bubble, so time the model spends writing is part of the pause.
- **One teller at a time.** In a group chat the second teller's reply stays hidden until the first teller's last bubble is shown.
- **Readings with the first bubble.** A reply's reading (spread, signature card, I Ching card, chart, fan, toss, form) appears together with its first bubble.
- **Sending flushes.** Sending a new message, or opening another chat, shows any pending bubbles at once.
- **Unchanged.** The backend, saved messages, history loaded from the server, and video calls (which speak each sentence as soon as it is released).

## Non-goals

- Pacing in video calls.
- A setting to turn pacing off or change its speed.
- Typing indicators in the chat list.

ADRs reviewed: ADR-0001, ADR-0015, ADR-0017, ADR-0019, ADR-0020, ADR-0021
