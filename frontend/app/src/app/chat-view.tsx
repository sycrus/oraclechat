"use client"

import React, { useEffect, useRef, useState, type FormEvent } from "react"
import { parseLinks, parseSources } from "../lib/search"
import { parseIChingReading } from "../lib/iching"
import { parseSignatureCard, parseTarotSpread, type SignatureCard } from "../lib/tarot"
import { parseCardFan } from "../lib/fan"
import { parseTossInteraction } from "../lib/toss"
import { parseAstrologyReading } from "../lib/astrology"
import { parseBirthForm, type BirthDetailsSubmission, type Place } from "../lib/birth-form"
import { dayPills, runStarts, showsName, tickState } from "../lib/thread"
import { chatName } from "../lib/chat-list"
import { TarotArtwork } from "./tarot-artwork"
import { CardFan } from "./card-fan"
import { CoinToss } from "./coin-toss"
import { ChartSummary } from "./chart-wheel"
import { IChingCard } from "./iching-view"
import { BirthInvite } from "./birth-invite"
import { ConversationAvatar } from "./avatar"
import { Icon } from "./icons"
import { Composer, LinkList, SearchSources, MessageBubbles, SignatureCardView, isAwaitingTeller, positionLabel, thinkingLabel } from "./message-body"

export type Message = { id: string; senderType: "user" | "teller"; senderId: string; content: string; createdAt?: string; reading?: unknown; signatureCard?: SignatureCard; search?: unknown; links?: unknown; interaction?: unknown }
export type Conversation = { id: string; title: string; tellerIds: string[]; messages: Message[] }
export type InteractionAction = { action: "pick" | "unpick"; index: number } | { action: "reveal" } | { action: "toss"; after: number } | { action: "submit"; details: BirthDetailsSubmission }
type Teller = { id: string; name: string; detail: string }

const clock = (iso?: string) => { if (!iso) return null; const date = new Date(iso); return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` }

/** The open chat's header (chat spec: Chat header and menu). */
export function ChatHeader({ tellerIds, tellers, status, onBack, onCall, onDelete, initialMenuOpen = false }: {
  tellerIds: string[]
  tellers: Teller[]
  /** Overrides the subtitle, e.g. "typing…". */
  status?: string | undefined
  onBack: () => void
  onCall?: (() => void) | undefined
  onDelete: () => void
  initialMenuOpen?: boolean
}) {
  const [menu, setMenu] = useState(initialMenuOpen)
  const members = tellerIds.map((id) => tellers.find((teller) => teller.id === id))
  const subtitle = status ?? (members.length > 1 ? [...members.map((teller) => teller?.name ?? ""), "You"].join(", ") : members[0]?.detail ?? "")
  return <header className="chat-header">
    <button type="button" className="icon-button back" aria-label="Back to chats" onClick={onBack}><Icon name="back" /></button>
    <ConversationAvatar tellerIds={tellerIds} size={40} />
    <span className="header-copy"><strong>{chatName(tellerIds, tellers)}</strong><small className={status ? "typing" : ""}>{subtitle}</small></span>
    {onCall && <button type="button" className="icon-button" aria-label={`Video call ${members[0]?.name ?? ""}`} onClick={onCall}><Icon name="video" /></button>}
    <span className="menu-wrap">
      <button type="button" className="icon-button" aria-label="More options" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((open) => !open)}><Icon name="more" /></button>
      {menu && <span className="menu px" role="menu">
        <button type="button" role="menuitem" onClick={() => { setMenu(false); onDelete() }}><Icon name="trash" size={16} />Delete chat</button>
      </span>}
    </span>
  </header>
}

export interface ChatViewProps {
  conversation: Conversation
  tellers: Teller[]
  /** A message or reveal is in flight. */
  busy: boolean
  /** A fan pick, toss or submission is in flight. */
  interactionBusy: boolean
  streaming: boolean
  completedReplies: number
  draft: string
  onDraft: (value: string) => void
  onSend: (text: string) => void
  onBack: () => void
  onCall?: (() => void) | undefined
  onDelete: () => void
  onInteract: (messageId: string, action: InteractionAction) => Promise<void>
  searchPlaces: (query: string) => Promise<Place[]>
  error?: string | undefined
}

/** The open chat: header, the message thread with its reading cards, and the composer. */
export function ChatView({ conversation, tellers, busy, interactionBusy, streaming, completedReplies, draft, onDraft, onSend, onBack, onCall, onDelete, onInteract, searchPlaces, error }: ChatViewProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => { bottom.current?.scrollIntoView?.({ behavior: "smooth" }) }, [conversation.messages])
  const group = conversation.tellerIds.length > 1
  const starts = runStarts(conversation.messages)
  const pills = dayPills(conversation.messages)
  const awaiting = isAwaitingTeller({ busy, streaming, completed: completedReplies, expected: conversation.tellerIds.length })
  const anyBusy = busy || interactionBusy
  const ask = (question: string) => { if (!anyBusy) onSend(question) }
  const submit = (event: FormEvent) => { event.preventDefault(); if (draft.trim() && !busy) onSend(draft.trim()) }
  const toggle = (key: string) => setExpandedCard((current) => current === key ? null : key)

  return <div className="chat-view">
    <ChatHeader tellerIds={conversation.tellerIds} tellers={tellers} status={awaiting || streaming ? "typing…" : undefined} onBack={onBack} onCall={onCall} onDelete={onDelete} />
    <div className="thread wall">
      <div className="thread-inner">
        {conversation.messages.map((message, index) => <React.Fragment key={message.id}>
          {pills[index] && <div className="day-pill" role="separator" aria-label={pills[index]!}><span>{pills[index]}</span></div>}
          {(() => {
          const runStart = starts[index]!
          const time = clock(message.createdAt)
          if (message.senderType === "user") {
            const tick = tickState(conversation.messages, index)
            return <article key={message.id} className={`message user-message${runStart ? " run-start" : ""}`}>
              <div className={`message-bubble${runStart ? " tail" : ""}`}>
                <div className="message-text">{message.content}</div>
                <span className="meta">{time}{tick && <span className={`tick ${tick}`} role="img" aria-label={tick === "answered" ? "Answered" : "Sent"}><Icon name={tick === "answered" ? "ticks" : "tick"} size={16} /></span>}</span>
              </div>
              <LinkList links={parseLinks(message.links)} />
            </article>
          }
          const teller = tellers.find((item) => item.id === message.senderId)
          const reading = parseTarotSpread(message.reading)
          const casting = parseIChingReading(message.reading)
          const chart = parseAstrologyReading(message.reading)
          const birthForm = parseBirthForm(message.interaction)
          const sources = parseSources(message.search)
          const signature = parseSignatureCard(message.signatureCard)
          const fan = parseCardFan(message.interaction)
          const toss = parseTossInteraction(message.interaction)
          const signatureKey = `${message.id}-signature`
          const spreadView = reading && <div className={`tarot-spread ${reading.spread}${fan ? " fan-dealt" : ""}`} aria-label={`${reading.spread} tarot spread`}>
            {reading.cards.map((card) => {
              const key = `${message.id}-${card.position}`
              return <button className="tarot-card" data-position={card.position} key={key} onClick={() => toggle(key)} aria-expanded={expandedCard === key} aria-label={`${card.name}, ${card.position}, ${card.orientation}`}>
                <span className="card-face"><TarotArtwork name={card.name} artKey={card.artKey} reversed={card.orientation === "reversed"} /><strong>{card.name}</strong><small>{card.orientation}</small></span>
                <span className="card-position">{positionLabel(card.position)}</span>
                {expandedCard === key && <span className="card-meaning">{card.meaning}</span>}
              </button>
            })}
          </div>
          const meta = time ? <span className="meta">{time}</span> : undefined
          return <article key={message.id} className={`message teller-message${runStart ? " run-start" : ""}`}>
            {showsName({ group, runStart, senderType: "teller" }) && teller && <span className="sender-name">{teller.name}</span>}
            {message.content
              ? <MessageBubbles content={message.content} tail={runStart} meta={meta} />
              : <div className={`message-bubble${runStart ? " tail" : ""}`}><div className="message-text"><span className="typing">Reading the moment…</span></div></div>}
            {reading && !fan && spreadView}
            {fan && (fan.state === "revealed" && reading
              ? spreadView
              : fan.state === "revealed" ? null : <CardFan fan={fan} busy={anyBusy} onPick={(pick) => void onInteract(message.id, { action: "pick", index: pick })} onUnpick={(pick) => void onInteract(message.id, { action: "unpick", index: pick })} onReveal={() => void onInteract(message.id, { action: "reveal" })} />)}
            {signature && <SignatureCardView card={signature} expanded={expandedCard === signatureKey} onToggle={() => toggle(signatureKey)} />}
            {casting && <IChingCard reading={casting} busy={anyBusy} onAsk={ask} />}
            {chart && <ChartSummary reading={chart} busy={anyBusy} onAsk={ask} />}
            {toss && toss.state !== "revealed" && <CoinToss toss={toss} busy={anyBusy} onToss={() => void onInteract(message.id, { action: "toss", after: toss.lines.length })} />}
            {birthForm && <BirthInvite state={birthForm.state} busy={anyBusy} searchPlaces={searchPlaces} onSubmit={(details) => onInteract(message.id, { action: "submit", details })} />}
            {sources && <SearchSources {...sources} />}
          </article>
          })()}
        </React.Fragment>)}
        {awaiting && <article className="message teller-message thinking" role="status" aria-live="polite"><div className="message-bubble"><div className="message-text"><span className="typing">{thinkingLabel({ tellerCount: conversation.tellerIds.length, completed: completedReplies })}<span className="thinking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span></div></div></article>}
        <div ref={bottom} />
      </div>
    </div>
    {error && <div className="error-message" role="alert">{error}</div>}
    <Composer draft={draft} busy={busy} onDraft={onDraft} onSubmit={submit} />
  </div>
}
