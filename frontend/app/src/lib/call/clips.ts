/** Which body animation clip plays in a call. The call state decides the body; this only maps it to a clip. */

import type { Body } from "./state"

export type Clip = "idle" | "talk"

/** How long the talking clip is kept after speaking stops, so gaps between sentences don't drop to idle. */
export const TALK_HOLD_MS = 1200

/** The clip for this frame, given the body state and how long ago the teller last spoke. */
export function clipFor(body: Body, msSinceSpeaking: number, hasTalk: boolean): Clip {
  if (!hasTalk) return "idle"
  return body === "speaking" || msSinceSpeaking < TALK_HOLD_MS ? "talk" : "idle"
}

/** Index of the next talking clip: random, but never the previous one when there is a choice. */
export function nextTalk(count: number, previous: number, random: () => number = Math.random): number {
  if (count <= 1) return 0
  if (previous < 0 || previous >= count) return Math.floor(random() * count)
  const pick = Math.floor(random() * (count - 1))
  return pick >= previous ? pick + 1 : pick
}
