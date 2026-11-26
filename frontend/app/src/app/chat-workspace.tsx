"use client"

import { useEffect, useState } from "react"
import { parsePlaces, type BirthDetailsSubmission, type Place } from "../lib/birth-form"
import { withListTitle, withOpened, type ConversationSummary } from "../lib/chat-list"
import { CLEAR_HISTORY_CONFIRM } from "./message-body"
import { nextKind, type Memory } from "./memory-item"
import { CallOverlay } from "./call/call-overlay"
import { callableTeller } from "../lib/call/tellers"
import { chatTellers } from "../lib/tellers"
import { ChatList } from "./chat-list"
import { NewChat } from "./new-chat"
import { ChatView, type Conversation, type InteractionAction, type Message } from "./chat-view"
import { YouPanel, type SavedBirthDetails } from "./you-panel"
import { Icon } from "./icons"
import { bubbleRandom, nextReveal, paceView, type Shown } from "../lib/typing-pace"

type StreamEvent = { type: string; tellerId?: string; messageId?: string; text?: string; message?: Message; reading?: unknown; lookup?: unknown; links?: unknown; card?: unknown; error?: string }
type Pane = "chats" | "new" | "you"

/** Type-ahead search over the bundled, offline place list (ADR-0018). */
async function searchPlaces(query: string): Promise<Place[]> {
  const response = await fetch(`/api/places?q=${encodeURIComponent(query)}`)
  return response.ok ? parsePlaces(await response.json()) : []
}

/** Reads a server-sent event stream, calling `onEvent` for each event; an `error` event throws. */
async function readEvents(response: Response, onEvent: (item: StreamEvent) => void): Promise<void> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split("\n\n")
    buffer = blocks.pop() ?? ""
    for (const block of blocks) {
      const line = block.split("\n").find((entry) => entry.startsWith("data: "))
      if (!line) continue
      const item = JSON.parse(line.slice(6)) as StreamEvent
      if (item.type === "error") throw new Error(item.error ?? "Response failed")
      onEvent(item)
    }
    if (done) break
  }
}

/** OracleChat (ADR-0019): the chat list beside the open chat on desktop, one pane at a time on a phone. */
export default function ChatWorkspace() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [active, setActive] = useState<Conversation | null>(null)
  const [pane, setPane] = useState<Pane>("chats")
  // On a phone, whether the open chat covers the list.
  const [chatOpen, setChatOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [completedReplies, setCompletedReplies] = useState(0)
  const [error, setError] = useState("")
  const [memoryConsent, setMemoryConsent] = useState(false)
  const [hostedReplies, setHostedReplies] = useState(false)
  const [guardrails, setGuardrails] = useState(false)
  const [hostedConsent, setHostedConsent] = useState(false)
  const [memories, setMemories] = useState<Memory[]>([])
  // undefined while the You tab is loading them, null when none are saved.
  const [birthDetails, setBirthDetails] = useState<SavedBirthDetails | null | undefined>(undefined)
  const [calling, setCalling] = useState(false)
  const [fanBusy, setFanBusy] = useState(false)
  // Paced reply reveal (chat spec): replies received live in arrival order, bubbles shown per reply, and when the last
  // bubble (or the user's send) happened. Clearing `live` shows everything at once.
  const [live, setLive] = useState<{ id: string; complete: boolean }[]>([])
  const [shown, setShown] = useState<Shown>({})
  const [lastRevealAt, setLastRevealAt] = useState(0)
  // ?say=1 keeps M1's verbatim speech for testing the voice (ADR-0015).
  const [callMode] = useState<"chat" | "say">(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("say") === "1" ? "say" : "chat")

  async function refreshList() {
    const response = await fetch("/api/conversations", { cache: "no-store" })
    if (!response.ok) throw new Error("Could not connect to the local Oracle service.")
    const list = await response.json() as ConversationSummary[]
    setConversations(list)
    setActive((current) => withListTitle(current, list))
  }

  async function openConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`)
    if (!response.ok) throw new Error("Could not load this conversation.")
    setActive(await response.json() as Conversation)
    setLive([])
    setChatOpen(true)
    setError("")
  }

  useEffect(() => {
    refreshList().catch((cause) => setError(cause instanceof Error ? cause.message : "Service unavailable"))
  }, [])

  /** Starts pacing a new turn: earlier replies show in full, and the first pause counts from now. */
  function startPacing() {
    setLive([]); setShown({}); setLastRevealAt(Date.now())
  }

  const liveReplies = live.flatMap((reply) => {
    const message = active?.messages.find((item) => item.id === reply.id)
    return message ? [{ ...reply, content: message.content }] : []
  })
  const next = nextReveal(liveReplies, shown, lastRevealAt, bubbleRandom)
  const [nextId, nextIndex, nextAt] = [next?.id, next?.index, next?.at]
  useEffect(() => {
    if (nextId === undefined || nextIndex === undefined || nextAt === undefined) return
    const timer = setTimeout(() => {
      setShown((current) => ({ ...current, [nextId]: nextIndex + 1 }))
      setLastRevealAt(Date.now())
    }, Math.max(0, nextAt - Date.now()))
    return () => clearTimeout(timer)
  }, [nextId, nextIndex, nextAt])
  useEffect(() => {
    fetch("/api/memory").then((response) => response.ok ? response.json() : null).then((value) => {
      if (value) { setMemoryConsent(value.consented); setMemories(value.memories); setHostedReplies(value.hostedReplies === true); setGuardrails(value.guardrails === true); setHostedConsent(value.hostedConsented === true) }
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (pane !== "you") return
    setBirthDetails(undefined)
    fetch("/api/birth-details").then((response) => response.ok ? response.json() : null).then((value) => {
      setBirthDetails(value ? value.profile ?? null : null)
    }).catch(() => setBirthDetails(null))
  }, [pane])

  async function saveBirthDetails(details: BirthDetailsSubmission) {
    const response = await fetch("/api/birth-details", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) })
    const value = await response.json().catch(() => ({})) as { profile?: SavedBirthDetails; error?: string }
    if (!response.ok || !value.profile) throw new Error(value.error ?? "Couldn't save your birth details.")
    setBirthDetails(value.profile)
  }

  async function deleteBirthDetails() {
    const response = await fetch("/api/birth-details", { method: "DELETE" })
    if (!response.ok) { setError("Could not delete your birth details."); return }
    setBirthDetails(null)
  }

  async function setConsent(consented: boolean) {
    const response = await fetch("/api/memory/consent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consented }) })
    if (!response.ok) throw new Error("Could not update memory settings")
    setMemoryConsent(consented)
    if (!consented) { setMemories([]); setHostedConsent(false) }
  }

  async function shareWithHosted(consented: boolean) {
    const response = await fetch("/api/memory/hosted-consent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consented }) })
    if (!response.ok) throw new Error("Could not update hosted sharing")
    setHostedConsent(consented)
  }

  async function updateMemory(memory: Memory) {
    const content = window.prompt("Edit this saved detail", memory.content)
    if (!content?.trim()) return
    const response = await fetch(`/api/memory/${memory.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) })
    if (!response.ok) { setError("Could not update this memory."); return }
    const updated = await response.json() as Memory
    setMemories((items) => items.map((item) => item.id === updated.id ? updated : item))
  }

  async function togglePin(memory: Memory) {
    const response = await fetch(`/api/memory/${memory.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: nextKind(memory.kind) }) })
    if (!response.ok) { setError("Could not update this memory."); return }
    const updated = await response.json() as Memory
    setMemories((items) => items.map((item) => item.id === updated.id ? updated : item))
  }

  async function deleteMemory(id: string) {
    const response = await fetch(`/api/memory/${id}`, { method: "DELETE" })
    if (response.ok) setMemories((items) => items.filter((item) => item.id !== id))
  }

  async function createConversation(tellerIds: string[]) {
    setError("")
    try {
      const response = await fetch("/api/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tellerIds }),
      })
      const value = await response.json()
      if (!response.ok) throw new Error(value.error ?? "Could not start a conversation")
      setActive(value)
      setConversations((items) => withOpened(items, value))
      setPane("chats")
      setChatOpen(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start a conversation") }
  }

  async function clearHistory() {
    if (!window.confirm(CLEAR_HISTORY_CONFIRM)) return
    const response = await fetch("/api/conversations", { method: "DELETE" })
    if (!response.ok) { setError("Could not clear chat history."); return }
    setConversations([])
    setActive(null)
    setChatOpen(false)
  }

  async function removeConversation(id: string) {
    if (!window.confirm("Delete this chat? Its messages are removed; your saved memories from it are deleted too.")) return
    const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
    if (!response.ok) { setError("Could not delete this conversation."); return }
    setConversations((items) => items.filter((item) => item.id !== id))
    if (active?.id === id) { setActive(null); setChatOpen(false) }
  }

  /** Replaces a message by id, e.g. with the server's updated copy of a card fan. */
  function replaceMessage(updated: Message) {
    setActive((current) => current ? { ...current, messages: current.messages.map((message) => message.id === updated.id ? updated : message) } : current)
  }

  /** Applies the events that build a teller's reply: its lookup, start, chunks, completion, and in-place updates. */
  function applyTellerEvent(item: StreamEvent, lookups: Record<string, unknown>) {
    if (item.type === "teller_lookup" && item.tellerId) lookups[item.tellerId] = item.lookup
    if (item.type === "message_start" && item.tellerId && item.messageId) {
      setStreaming(true)
      setLive((current) => [...current, { id: item.messageId!, complete: false }])
      const lookup = lookups[item.tellerId]
      setActive((current) => current ? { ...current, messages: [...current.messages, { id: item.messageId!, senderType: "teller", senderId: item.tellerId!, content: "", createdAt: new Date().toISOString(), ...(item.reading ? { reading: item.reading } : {}), ...(item.card ? { signatureCard: item.card as NonNullable<Message["signatureCard"]> } : {}), ...(lookup ? { search: lookup } : {}) }] } : current)
    } else if (item.type === "message_chunk" && item.messageId && item.text) {
      setActive((current) => current ? { ...current, messages: current.messages.map((message) => message.id === item.messageId ? { ...message, content: message.content + item.text } : message) } : current)
    } else if (item.type === "message_complete" && item.message) {
      setStreaming(false)
      setCompletedReplies((count) => count + 1)
      replaceMessage(item.message)
      const completed = item.message.id
      setLive((current) => current.map((reply) => reply.id === completed ? { ...reply, complete: true } : reply))
    } else if (item.type === "message_update" && item.message) {
      replaceMessage(item.message)
    }
  }

  /**
   * An action on an interactive message (ADR-0017): a fan pick or reveal, a coin toss, or a birth-details submission.
   * Reveals stream the teller's interpretation. A failed submission throws, so the form can show why and stay open.
   */
  async function interact(messageId: string, action: InteractionAction) {
    if (!active || busy || fanBusy) return
    const reveal = action.action === "reveal" || action.action === "toss" || action.action === "submit"
    setFanBusy(true); setError("")
    if (reveal) { setBusy(true); setStreaming(false); setCompletedReplies(0); startPacing() }
    try {
      const response = await fetch(`/api/conversations/${active.id}/messages/${messageId}/interactions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action),
      })
      if (response.ok && response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
        const lookups: Record<string, unknown> = {}
        await readEvents(response, (item) => applyTellerEvent(item, lookups))
      } else {
        const result = await response.json().catch(() => ({})) as { message?: Message; error?: string }
        if (!response.ok || !result.message) throw new Error(result.error ?? "That didn't work. Try again.")
        replaceMessage(result.message)
      }
    } catch (cause) {
      // The message may have changed on the server (or the reply failed after the reveal): show what is really saved.
      setLive([])
      void openConversation(active.id).catch(() => undefined)
      if (action.action === "submit") throw cause
      setError(cause instanceof Error ? cause.message : "That didn't work. Try again.")
    } finally {
      setFanBusy(false)
      if (reveal) { setBusy(false); setStreaming(false); void refreshList().catch(() => undefined) }
    }
  }

  /** Sends a message: typed in the composer or picked from a suggested question (chat spec: Suggested questions). */
  async function send(text: string) {
    const content = text.trim()
    if (!content || !active || busy) return
    setDraft(""); setBusy(true); setError(""); setStreaming(false); setCompletedReplies(0); startPacing()
    const userMessage: Message = { id: `local-${Date.now()}`, senderType: "user", senderId: "local-user", content, createdAt: new Date().toISOString() }
    setActive((current) => current ? { ...current, messages: [...current.messages, userMessage] } : current)
    try {
      const response = await fetch(`/api/conversations/${active.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
      })
      if (!response.ok || !response.body) throw new Error("The local Oracle service could not respond.")
      // A teller's lookup arrives just before its reply starts.
      const lookups: Record<string, unknown> = {}
      await readEvents(response, (item) => {
        if (item.type === "links_read") {
          setActive((current) => current ? { ...current, messages: current.messages.map((message) => message.id === userMessage.id ? { ...message, links: item.links } : message) } : current)
        }
        applyTellerEvent(item, lookups)
      })
    } catch (cause) { setLive([]); setError(cause instanceof Error ? cause.message : "Response failed") }
    finally { setBusy(false); setStreaming(false); void refreshList().catch(() => undefined) }
  }

  const callTeller = active ? callableTeller(active.tellerIds, chatTellers) : null
  const tab = (target: "chats" | "you") => { setPane(target); if (target === "you") setChatOpen(false) }
  const tabs = <>
    <button type="button" aria-label="Chats" aria-current={pane !== "you" ? "page" : undefined} onClick={() => tab("chats")}><span className="tab-icon px"><Icon name="chats" /></span><span className="tab-label">Chats</span></button>
    <button type="button" aria-label="You" aria-current={pane === "you" ? "page" : undefined} onClick={() => tab("you")}><span className="tab-icon px"><Icon name="user" /></span><span className="tab-label">You</span></button>
  </>

  return (
    <main className={`app${chatOpen ? " chat-open" : ""}`}>
      <nav className="rail" aria-label="Sections">{tabs}</nav>
      <section className="pane-list" aria-label={pane === "you" ? "You" : "Chats"}>
        <div className="pane-scroll">
          {pane === "new"
            ? <NewChat tellers={chatTellers} onBack={() => setPane("chats")} onStart={(ids) => void createConversation(ids)} />
            : pane === "you"
              ? <YouPanel memoryConsent={memoryConsent} hostedReplies={hostedReplies} guardrails={guardrails} hostedConsent={hostedConsent} memories={memories} birthDetails={birthDetails} hasConversations={conversations.length > 0}
                  onConsent={(value) => void setConsent(value).catch((cause) => setError(String(cause)))} onHostedConsent={(value) => void shareWithHosted(value).catch((cause) => setError(String(cause)))}
                  onPin={(memory) => void togglePin(memory)} onEdit={(memory) => void updateMemory(memory)} onDeleteMemory={(id) => void deleteMemory(id)}
                  onSaveBirth={saveBirthDetails} onDeleteBirth={() => void deleteBirthDetails()} onClearHistory={() => void clearHistory()} searchPlaces={searchPlaces} />
              : <ChatList conversations={conversations} tellers={chatTellers} activeId={active?.id} query={query} onQuery={setQuery} onNew={() => setPane("new")}
                  onOpen={(id) => void openConversation(id).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))} />}
          {error && !active && <div className="error-message" role="alert">{error}</div>}
        </div>
        {pane !== "new" && <nav className="tabbar" aria-label="Sections">{tabs}</nav>}
      </section>
      <section className="pane-chat" aria-label="Chat">
        {active
          ? <ChatView conversation={active} tellers={chatTellers} busy={busy} interactionBusy={fanBusy} streaming={streaming} completedReplies={completedReplies}
              draft={draft} onDraft={setDraft} onSend={(text) => void send(text)} onBack={() => setChatOpen(false)} error={error}
              onCall={callTeller ? () => setCalling(true) : undefined} onDelete={() => void removeConversation(active.id)}
              onInteract={interact} searchPlaces={searchPlaces} pace={paceView(liveReplies, shown)} />
          : <div className="chat-empty wall"><div className="chat-empty-card px"><h2 className="wordmark">OracleChat</h2><p>Pick a chat on the left, or start a new one with a teller.</p><button type="button" className="primary px" onClick={() => setPane("new")}><Icon name="newchat" />New chat</button></div></div>}
      </section>
      {calling && active && callTeller && <CallOverlay teller={callTeller} conversationId={active.id} mode={callMode} onEnd={() => setCalling(false)} onTurnComplete={() => void openConversation(active.id).catch((cause) => setError(String(cause)))} searchPlaces={searchPlaces} />}
    </main>
  )
}
