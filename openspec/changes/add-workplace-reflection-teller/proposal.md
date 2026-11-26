## Intent

Add Milo, a workplace-reflection teller who offers brief, context-selected business prompts for work style, team culture and workplace situations.

ADRs reviewed: ADR-0001, ADR-0002, ADR-0003, ADR-0008, ADR-0009, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0017, ADR-0019, ADR-0021, ADR-0022

## Why

The current roster has no teller focused on work relationships and company culture. Long personality questionnaires are a poor fit for chat. Milo should have several short reflection patterns and offer the one that fits the user's current context.

## What changes

- Add Milo as a workplace-reflection teller, available in one-to-one and two-teller chats.
- Give the local turn router a closed set of Milo reflection-tool names and let it select at most one when the current message makes one useful.
- Keep prompts and conversational patterns app-owned. Milo offers a short, optional prompt in ordinary chat; no long quiz or model-generated UI is introduced.
- Include work-style preferences, team climate, meeting preparation, tradeoffs, overused strengths and role fit. Frame any MBTI-like discussion as informal reflection, not an official type or validated assessment; never issue a company-fit verdict.
- Use the linked character from Polygonal Mind's 100Avatars repo, subject to the existing local-call model requirements and asset packaging rules; preserve CC BY 4.0 attribution.

## Non-goals

- A full MBTI inventory, validated psychometric test, hiring screen or employee evaluation.
- Automated company culture scoring or recommendations to hire, fire or reject a person.
- New memory collection, hosted model requirements, or model-authored interface components.

## ADR alignment

The new discipline follows ADR-0013: one declared specialty with app-owned methods and bounded outputs. Its reflection patterns follow ADR-0017's closed, validated interaction catalog; routing selects only an enum name, and the application owns the prompts and behavior.
