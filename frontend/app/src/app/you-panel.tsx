import React from "react"
import type { BirthDetailsSubmission, Place } from "../lib/birth-form"
import { BirthDetailsForm } from "./birth-details-form"
import { MemoryItem, type Memory } from "./memory-item"
import { modelStatusLabel } from "./message-body"

export type SavedBirthDetails = { date: string; time: string; place: Place }

export interface YouPanelProps {
  memoryConsent: boolean
  hostedReplies: boolean
  /** Guarded mode is on (ADR-0021). */
  guardrails: boolean
  hostedConsent: boolean
  memories: Memory[]
  /** undefined while loading, null when none are saved. */
  birthDetails: SavedBirthDetails | null | undefined
  hasConversations: boolean
  onConsent: (consented: boolean) => void
  onHostedConsent: (consented: boolean) => void
  onPin: (memory: Memory) => void
  onEdit: (memory: Memory) => void
  onDeleteMemory: (id: string) => void
  onSaveBirth: (details: BirthDetailsSubmission) => Promise<void>
  onDeleteBirth: () => void
  onClearHistory: () => void
  searchPlaces: (query: string) => Promise<Place[]>
}

/** The You tab (chat spec: Settings in the You tab): memory, privacy, birth details and chat history. */
export function YouPanel(props: YouPanelProps) {
  const { memoryConsent, hostedReplies, guardrails, hostedConsent, memories, birthDetails } = props
  return <div className="you-panel">
    <header className="pane-header"><h2 className="pane-title">You</h2><span className="pane-status"><span className="local-dot" aria-hidden="true" />{modelStatusLabel(hostedReplies, guardrails)}</span></header>
    <div className="settings">
      <section className="settings-group" aria-labelledby="memory-title">
        <h3 id="memory-title" className="section-label">MEMORY</h3>
        <p className="settings-note">Oracle can save useful details from your readings on this computer. You can review, edit or remove them any time.</p>
        <label className="setting-row px"><span><strong>Remember details</strong><small>{memoryConsent ? "Memory is on" : "Memory is off"}</small></span><input type="checkbox" className="switch" checked={memoryConsent} onChange={(event) => props.onConsent(event.target.checked)} /></label>
        {memoryConsent && hostedReplies && <label className="setting-row px"><span><strong>Share saved details with the hosted model</strong><small>{hostedConsent ? "Hosted replies can use your saved details" : "Hosted replies get the conversation only"}</small></span><input type="checkbox" className="switch" checked={hostedConsent} onChange={(event) => props.onHostedConsent(event.target.checked)} /></label>}
        {memoryConsent
          ? <div className="saved-memories">
              <h4>Saved details <span>{memories.length}</span></h4>
              {memories.map((memory) => <MemoryItem key={memory.id} memory={memory} onPin={props.onPin} onEdit={props.onEdit} onDelete={props.onDeleteMemory} />)}
              {memories.length === 0 && <p className="settings-note">No saved details yet. Oracle only saves details you share in a conversation.</p>}
              <button type="button" className="danger-link" onClick={() => props.onConsent(false)}>Turn off and delete all saved details</button>
            </div>
          : <p className="settings-note">Nothing is saved until you turn this on. Your chat history is separate.</p>}
      </section>
      <section className="settings-group" aria-labelledby="birth-title">
        <h3 id="birth-title" className="section-label">BIRTH DETAILS · FOR ASTRA</h3>
        {birthDetails === undefined ? <p className="settings-note">Loading…</p> : birthDetails
          ? <><p className="settings-note">Saved on this computer. Astra uses them for every chart; tellers see only the computed chart.</p>
              <BirthDetailsForm key={`${birthDetails.date}-${birthDetails.time}-${birthDetails.place.id}`} initial={birthDetails} searchPlaces={props.searchPlaces} onSubmit={props.onSaveBirth} submitLabel="Save changes" />
              <button type="button" className="danger-link" onClick={props.onDeleteBirth}>Delete my birth details</button></>
          : <><p className="settings-note">Not saved. Astra asks for them the first time you want a chart, or you can add them here.</p>
              <BirthDetailsForm searchPlaces={props.searchPlaces} onSubmit={props.onSaveBirth} submitLabel="Save birth details" /></>}
      </section>
      {props.hasConversations && <section className="settings-group" aria-labelledby="history-title">
        <h3 id="history-title" className="section-label">CHATS</h3>
        <button type="button" className="danger-link" onClick={props.onClearHistory}>Clear chat history</button>
      </section>}
    </div>
  </div>
}
