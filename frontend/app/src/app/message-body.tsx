import React, { type FormEvent, type ReactNode } from "react"
import Markdown from "react-markdown"
import type { LinkRef, SearchResult } from "../lib/search"
import type { SignatureCard } from "../lib/tarot"
import { TarotArtwork } from "./tarot-artwork"
import { Icon } from "./icons"

export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
}

/** One bubble per paragraph; only the first of a run gets the tail, and the last carries the time and ticks. */
export function MessageBubbles({ content, byline, tail = false, meta }: { content: string; byline?: ReactNode; tail?: boolean; meta?: ReactNode }) {
  const paragraphs = splitParagraphs(content)
  return <>{paragraphs.map((paragraph, index) => (
    <div key={index} className={`message-bubble${tail && index === 0 ? " tail" : ""}`}>
      {index === 0 && byline}
      <div className="message-text"><Markdown>{paragraph}</Markdown></div>
      {index === paragraphs.length - 1 && meta}
    </div>
  ))}</>
}

export function isAwaitingTeller(state: { busy: boolean; streaming: boolean; completed: number; expected: number }): boolean {
  return state.busy && !state.streaming && state.completed < state.expected
}

export const signatureLabels: Record<SignatureCard["position"], string> = { action: "Action card", shadow: "Shadow card" }

export function SignatureCardView({ card, expanded, onToggle }: { card: SignatureCard; expanded: boolean; onToggle: () => void }) {
  const label = signatureLabels[card.position]
  return <button type="button" className="signature-card" onClick={onToggle} aria-expanded={expanded} aria-label={`${label}: ${card.name}, ${card.orientation}`}>
    <span className="signature-art"><TarotArtwork name={card.name} artKey={card.artKey} reversed={card.orientation === "reversed"} /></span>
    <span className="signature-copy"><small>{label}</small><strong>{card.name}</strong><em>{card.orientation}</em>
      {expanded && <span className="signature-meaning">{card.meaning}</span>}</span>
  </button>
}

/** Sources a teller looked up, shown under its reply; or a note that its search failed. Older messages have no query. */
export function SearchSources({ query, results, error }: { query?: string; results: SearchResult[]; error?: string }) {
  if (error) return <div className="search-sources"><small>Web search was unavailable</small></div>
  if (results.length === 0) return null
  return <div className="search-sources">
    <small>{query ? <>Looked up: <em>{query}</em></> : "Sources"}</small>
    <ul>{results.map((result) => <li key={result.url}><a href={result.url} target="_blank" rel="noopener noreferrer">{result.title}</a></li>)}</ul>
  </div>
}

/** Links the user pasted: the ones the tellers read, and the ones that couldn't be opened. */
export function LinkList({ links }: { links: LinkRef[] }) {
  if (links.length === 0) return null
  return <div className="search-sources">
    <small>Links read</small>
    <ul>{links.map((link) => <li key={link.url}>{link.title !== undefined
      ? <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title || link.url}</a>
      : <span>{link.url} · {link.error}</span>}</li>)}</ul>
  </div>
}

/** The message box. Readings and lookups are asked for in words, so there are no other controls. */
export function Composer({ draft, busy, onDraft, onSubmit }: { draft: string; busy: boolean; onDraft: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="composer" onSubmit={onSubmit}>
    <label className="composer-field px">
      <textarea aria-label="Message" value={draft} onChange={(event) => onDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit(event as unknown as FormEvent) } }} placeholder="Message" rows={1} disabled={busy} />
    </label>
    <button type="submit" className="send-button px-round" disabled={!draft.trim() || busy} aria-label="Send message"><Icon name="send" /></button>
  </form>
}

export const positionLabel = (position: string): string => position.replace(/-/g, " ")

export function thinkingLabel({ tellerCount, completed }: { tellerCount: number; completed: number }): string {
  return tellerCount === 2 && completed === 0 ? "Your tellers are thinking" : "Thinking"
}

export const CLEAR_HISTORY_CONFIRM = "Delete all conversations? Your saved memories are kept."

/** Top-bar status: where teller replies are generated (ADR-0014). */
export function modelStatusLabel(hostedReplies: boolean, guardrails = false): string {
  return `${hostedReplies ? "Hosted model" : "Local models"}${guardrails ? " · OpenAI guardrails" : ""}`
}
