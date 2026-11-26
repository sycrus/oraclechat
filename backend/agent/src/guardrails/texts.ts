/** App-written texts for guarded mode (ADR-0021). They are never sent to a model or a check. */

/** Replaces a reply whose first sentence failed its check. */
export const GUARD_STAND_IN = "Let me put that differently: a reading shows possibilities, not fixed outcomes, and what you choose next still shapes them."

/** Ends a turn whose message is refused; no teller replies. */
export const GUARD_REFUSAL = "That's not something we can talk about here. You're welcome to ask about something else."

/**
 * Shown after a care turn's reply. It informs only: the app never contacts anyone,
 * dials a number or opens a link for the user (owner decision, 2026-11-25).
 */
export const SUPPORT_TEXT = "If you're thinking about hurting yourself or don't feel safe, please reach out to someone now. If you're in immediate danger, call your local emergency number. You can find a free, confidential helpline in your country at findahelpline.com, or talk to someone you trust."

/** Replaces the no-draw note and is added to the instructions in a care turn. */
export const CARE_NOTE = "The user may be in distress or thinking about harming themselves. Step out of the reading entirely: no cards, coins, charts, predictions or fortune-telling language. Answer sincerely and warmly in your own voice, in 2-4 short sentences: acknowledge what they shared, tell them they matter, and gently encourage them to reach out to someone they trust or a crisis line. Give no instructions, diagnoses or promises, and never say you will contact anyone. The app shows support contacts after your reply."
