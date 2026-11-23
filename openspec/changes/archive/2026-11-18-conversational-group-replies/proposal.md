## Intent

Make group readings feel like a conversation: both chosen tellers speak, replies arrive as several short chat bubbles with readable formatting, and the user can see when a teller is working.

## Why now

Live use over the Tailscale link showed four problems: there is no visible activity while the ranker and model work, usually only one of two tellers replies, Markdown such as `**Past: …**` appears as raw symbols, and each reply lands as one long block of text.

## What changes

- Both tellers in a two-teller conversation respond every turn; ranking orders them (ADR-0008 supersedes the ADR-0007 threshold).
- Teller replies render Markdown safely (no raw HTML).
- Each teller reply is displayed as one chat bubble per paragraph, appearing as the stream reaches each paragraph; storage stays one message per teller.
- A thinking indicator shows while a teller reply is expected but has not started streaming.

## Non-goals

- Changing the persisted message model, SSE event types, or teller prompts.
- Supporting more than two tellers or new spreads.

ADRs reviewed: ADR-0001, ADR-0003, ADR-0004, ADR-0006, ADR-0007, ADR-0008
