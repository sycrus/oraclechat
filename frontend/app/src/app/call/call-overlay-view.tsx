"use client"

import React, { type FormEvent, type ReactNode } from "react"
import { Icon } from "../icons"

export interface CallOverlayViewProps {
  tellerName: string
  voice: "checking" | "online" | "offline"
  model: "loading" | "ready" | "failed"
  state: "idle" | "thinking" | "speaking"
  subtitle?: string
  /** A reading from this call's turns, shown just above the call bar (ADR-0020). */
  panel?: ReactNode
  error?: string
  /** A turn is in flight: sending is disabled. */
  busy?: boolean
  draft: string
  placeholder?: string
  onDraft: (value: string) => void
  onSay: () => void
  onEnd: () => void
  /** Open mic (ADR-0016): absent until the microphone has been asked for. */
  mic?: "on" | "muted" | "blocked"
  /** Whether local speech recognition is available. */
  listening?: "ok" | "offline"
  /** The owner is speaking now. */
  hearing?: boolean
  /** What the owner just said, shown while the teller thinks. */
  ownerCaption?: string
  onToggleMic?: () => void
  /** The 3D canvas, mounted by the stateful overlay. */
  stage?: ReactNode
}

export function CallOverlayView({ tellerName, voice, model, state, subtitle, panel, error, busy = false, draft, placeholder, onDraft, onSay, onEnd, stage, mic, listening, hearing = false, ownerCaption, onToggleMic }: CallOverlayViewProps) {
  const submit = (event: FormEvent) => { event.preventDefault(); if (!busy) onSay() }
  const caption = subtitle ?? (state === "thinking" ? (ownerCaption ? `You: ${ownerCaption}` : "…") : undefined)
  const micUsable = (mic === "on" || mic === "muted") && listening !== "offline"
  const status = voice === "offline" ? "Voice offline · showing subtitles"
    : mic === "blocked" ? "Microphone unavailable — type instead"
    : mic && listening === "offline" ? "Can't hear you right now — type instead"
    : model === "loading" ? `Connecting to ${tellerName}…`
    : state === "speaking" ? "speaking" : state === "thinking" ? "thinking…" : "on call"
  return (
    <div className="call-overlay" role="dialog" aria-modal="true" aria-label={`Video call with ${tellerName}`} data-state={state}>
      <div className="call-stage">
        {stage}
        {model === "failed" && <><div className="call-avatar-fallback" aria-hidden="true">{tellerName.slice(0, 1)}</div><div className="call-notice px">Model unavailable</div></>}
      </div>
      <div className="call-topline">
        <span className="call-heading">
          <span className="call-title">{tellerName}</span>
          <span className="call-status" role="status"><span className={`call-dot ${voice}`} aria-hidden="true" />{status}</span>
        </span>
      </div>
      <div className="call-dock">
        {caption && <p className="call-subtitle" aria-live="polite">{caption}</p>}
        {error && <p className="call-error px" role="alert">{error}</p>}
        {panel && <div className="call-panel px">{panel}</div>}
      </div>
      {/* One call bar (voice-calls: Call screen layout): typing, send, mic and end call on a single line along the bottom. */}
      <form className="call-bar" onSubmit={submit}>
        <input aria-label={`Message for ${tellerName}`} placeholder={placeholder ?? `Say something to ${tellerName}`} value={draft} maxLength={600} onChange={(event) => onDraft(event.target.value)} />
        <button type="submit" disabled={busy || !draft.trim()} className="call-send px-round" aria-label="Send"><Icon name="send" /></button>
        {micUsable && <button type="button" className={`call-mic${hearing ? " hearing" : ""}`} aria-pressed={mic === "muted"} aria-label={mic === "muted" ? "Unmute microphone" : "Mute microphone"} onClick={onToggleMic}><Icon name={mic === "muted" ? "mute" : "mic"} /></button>}
        <button type="button" className="call-end px-round" aria-label="End call" onClick={onEnd}><Icon name="end" /></button>
      </form>
    </div>
  )
}
