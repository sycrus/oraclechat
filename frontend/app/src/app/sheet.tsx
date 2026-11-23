"use client"

import React, { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Icon } from "./icons"

/**
 * A bottom sheet or full-screen view over the chat (ADR-0019): a dithered backdrop, a titled dialog, and
 * closing by its button, the backdrop or Escape.
 */
export function Sheet({ title, onClose, children, full = false, footer }: {
  title: string
  onClose: () => void
  children: ReactNode
  /** Fill the screen (forms, the full chart) instead of rising from the bottom. */
  full?: boolean
  footer?: ReactNode
}) {
  // Portalled to <body> once mounted, so stepped (clip-path) cards around the trigger can't clip it.
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => { setHost(document.body) }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])
  const layer = <div className={`sheet-layer${full ? " full" : ""}`}>
    <button type="button" className="sheet-backdrop dither" aria-label="Close" tabIndex={-1} onClick={onClose} />
    <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <header className="sheet-header">
        {!full && <span className="sheet-handle" aria-hidden="true" />}
        <h2 className="sheet-title">{title}</h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" size={16} /></button>
      </header>
      <div className="sheet-body">{children}</div>
      {footer && <div className="sheet-footer">{footer}</div>}
    </section>
  </div>
  return host ? createPortal(layer, host) : layer
}

/** Suggested questions (chat spec): each is sent as the user's message. */
export function AskChips({ label, questions, busy, onAsk }: { label: string; questions: string[]; busy: boolean; onAsk: (question: string) => void }) {
  if (questions.length === 0) return null
  return <div className="ask">
    <span className="section-label">{label}</span>
    <div className="chips">{questions.map((question) => <button key={question} type="button" className="chip px" disabled={busy} onClick={() => onAsk(question)}>{question}</button>)}</div>
  </div>
}
