import { splitParagraphs } from "../app/message-body"

/**
 * Paced reply reveal (chat spec): live teller replies appear like someone typing, one paragraph bubble at a time.
 * These are the pure rules; chat-workspace.tsx runs the timers and chat-view.tsx renders the result.
 */

/** A teller reply received in this session, in arrival order. */
export interface LiveReply { id: string; content: string; complete: boolean }

/** How a live reply is shown right now. */
export interface PaceView { bubbles: number; typing: boolean; hidden: boolean }

/** Bubbles revealed so far, per reply id. */
export type Shown = Record<string, number>

const MIN_MS = 1000
const MAX_MS = 6000

/** The typing pause before a bubble: longer for longer text, ±20% random, within 1–6 s. */
export function typingDelayMs(text: string, random: () => number = Math.random): number {
  const delay = (800 + 30 * text.length) * (0.8 + 0.4 * random())
  return Math.round(Math.min(MAX_MS, Math.max(MIN_MS, delay)))
}

/** Paragraphs that are fully written: all of them once the reply is complete, otherwise all but the last. */
function ready(reply: LiveReply): string[] {
  const paragraphs = splitParagraphs(reply.content)
  return reply.complete ? paragraphs : paragraphs.slice(0, -1)
}

function finished(reply: LiveReply, shown: Shown): boolean {
  return reply.complete && (shown[reply.id] ?? 0) >= splitParagraphs(reply.content).length
}

/** Each live reply's view: finished replies in full, the first unfinished one typing, later ones hidden. */
export function paceView(replies: LiveReply[], shown: Shown): Record<string, PaceView> {
  const views: Record<string, PaceView> = {}
  let blocked = false
  for (const reply of replies) {
    if (blocked) { views[reply.id] = { bubbles: 0, typing: false, hidden: true }; continue }
    if (finished(reply, shown)) { views[reply.id] = { bubbles: splitParagraphs(reply.content).length, typing: false, hidden: false }; continue }
    views[reply.id] = { bubbles: shown[reply.id] ?? 0, typing: true, hidden: false }
    blocked = true
  }
  return views
}

/**
 * A random-looking number in [0, 1) fixed for one bubble (FNV-1a hash of reply id and index), so a bubble's pause
 * is drawn once and doesn't change each time the chat re-renders.
 */
export function bubbleRandom(id: string, index: number): number {
  let hash = 0x811c9dc5
  for (const char of `${id}:${index}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0
  return hash / 2 ** 32
}

/** The next bubble to reveal and when, counting its typing pause from the last reveal; null if none is ready. */
export function nextReveal(replies: LiveReply[], shown: Shown, lastRevealAt: number, random: (id: string, index: number) => number = () => Math.random()): { id: string; index: number; at: number } | null {
  const reply = replies.find((item) => !finished(item, shown))
  if (!reply) return null
  const index = shown[reply.id] ?? 0
  const paragraph = ready(reply)[index]
  if (paragraph === undefined) return null
  return { id: reply.id, index, at: lastRevealAt + typingDelayMs(paragraph, () => random(reply.id, index)) }
}
