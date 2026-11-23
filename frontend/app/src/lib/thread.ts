import { timeLabel } from "./chat-list"
/** Bubble grouping and ticks in an open chat (chat spec: Conversational reply presentation, Message ticks). */
type Sender = { senderType: "user" | "teller"; senderId: string }

/** Whether each message starts a run of consecutive messages from one sender (and so gets the bubble tail). */
export function runStarts(messages: Sender[]): boolean[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1]
    return !previous || previous.senderType !== message.senderType || previous.senderId !== message.senderId
  })
}

/** Sender names appear only in group chats, on a teller's first bubble of a run. */
export function showsName({ group, runStart, senderType }: { group: boolean; runStart: boolean; senderType: Sender["senderType"] }): boolean {
  return group && runStart && senderType === "teller"
}

/** A user message's tick: "sent" until a teller message follows it, then "answered". */
export function tickState(messages: Sender[], index: number): "sent" | "answered" | null {
  if (messages[index]?.senderType !== "user") return null
  return messages.slice(index + 1).some((message) => message.senderType === "teller") ? "answered" : "sent"
}

/** A day pill's text (chat spec: Day headers in the thread): "Today", or the chat list's day label otherwise. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const label = timeLabel(iso, now)
  return /^\d\d:\d\d$/.test(label) ? "Today" : label
}

/** The pill above each message, or null: one per day, above its first message. Unsaved messages count as today. */
export function dayPills(messages: { createdAt?: string | undefined }[], now: Date = new Date()): (string | null)[] {
  let previous = ""
  return messages.map((message) => {
    const date = message.createdAt ? new Date(message.createdAt) : now
    const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (day === previous) return null
    previous = day
    return dayLabel(date.toISOString(), now)
  })
}
