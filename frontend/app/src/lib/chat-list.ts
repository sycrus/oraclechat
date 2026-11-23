/** The chat list's rows (chat spec: Chat list rows): chat names, time labels, last-message previews and search. */
export interface LastMessage { senderType: "user" | "teller"; senderId: string; preview: string; createdAt: string }
export interface ConversationSummary { id: string; title: string; tellerIds: string[]; updatedAt?: string; lastMessage?: LastMessage }

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const pad = (value: number) => String(value).padStart(2, "0")
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** Today's clock time, "Yesterday", a weekday within the past week, or the date. */
export function timeLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const days = Math.round((dayStart(now) - dayStart(date)) / 86_400_000)
  if (days <= 0) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (days === 1) return "Yesterday"
  if (days < 7) return WEEKDAYS[date.getDay()]!
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** The last message with its sender: "You: …", or the teller's name in a group. */
export function previewLine(summary: ConversationSummary, tellers: { id: string; name: string }[]): string {
  const last = summary.lastMessage
  if (!last) return ""
  if (last.senderType === "user") return `You: ${last.preview}`
  if (summary.tellerIds.length < 2) return last.preview
  const name = tellers.find((teller) => teller.id === last.senderId)?.name
  return name ? `${name}: ${last.preview}` : last.preview
}

/** A chat's name, as WhatsApp names a contact: the teller, or both tellers for a group. */
export function chatName(tellerIds: string[], tellers: { id: string; name: string }[]): string {
  return tellerIds.map((id) => tellers.find((teller) => teller.id === id)?.name ?? id).join(" & ")
}

/** Search: teller names, the chat's topic (its first message) and the last message, ignoring case. */
export function filterChats<T extends ConversationSummary>(list: T[], query: string, tellers: { id: string; name: string }[]): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return list
  return list.filter((item) => [chatName(item.tellerIds, tellers), item.title, item.lastMessage?.preview ?? ""].some((text) => text.toLowerCase().includes(needle)))
}

/** The open chat with its title from the refreshed list: the server renames a chat after its first message. */
export function withListTitle<T extends { id: string; title: string }>(open: T | null, list: ConversationSummary[]): T | null {
  const listed = open && list.find((item) => item.id === open.id)
  return listed && listed.title !== open.title ? { ...open, title: listed.title } : open
}

/** The list after opening a chat: a new chat goes to the top, a reopened one stays where it is (one row per correspondent). */
export function withOpened<T extends { id: string }>(list: T[], opened: T): T[] {
  return list.some((item) => item.id === opened.id) ? list : [opened, ...list]
}
