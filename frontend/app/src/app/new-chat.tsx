"use client"

import React, { useState } from "react"
import { TellerAvatar } from "./avatar"
import { Icon } from "./icons"

type Teller = { id: string; name: string; detail: string }

/** The new-chat screen (chat spec: Starting a chat): tap a teller for a one-to-one chat, or make a group of two. */
export function NewChat({ tellers, onStart, onBack, initialMode = "single", initialPicked = [] }: {
  tellers: Teller[]
  onStart: (tellerIds: string[]) => void
  onBack: () => void
  initialMode?: "single" | "group"
  initialPicked?: string[]
}) {
  const [mode, setMode] = useState(initialMode)
  const [picked, setPicked] = useState(initialPicked)
  const toggle = (id: string) => setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current)
  const group = mode === "group"
  return <div className="new-chat">
    <header className="pane-header">
      <button type="button" className="icon-button" aria-label="Back" onClick={() => (group ? setMode("single") : onBack())}><Icon name="back" /></button>
      <h2 className="pane-title">{group ? "New group" : "New chat"}</h2>
    </header>
    {group && <p className="pane-hint">Pick two tellers. Both answer every message.</p>}
    <ul className="rows">
      {!group && <li><button type="button" className="chat-row" onClick={() => setMode("group")}>
        <span className="avatar avatar-accent avatar-52" aria-hidden="true"><Icon name="group" size={32} /></span>
        <span className="row-body"><span className="row-title">New group</span></span>
      </button></li>}
      {tellers.map((teller) => {
        const on = picked.includes(teller.id)
        return <li key={teller.id}>
          <button type="button" className="chat-row" {...(group ? { role: "checkbox", "aria-checked": on } : {})} onClick={() => (group ? toggle(teller.id) : onStart([teller.id]))}>
            <TellerAvatar tellerId={teller.id} />
            <span className="row-body"><span className="row-title">{teller.name}</span><span className="row-preview">{teller.detail}</span></span>
            {group && <span className={`check px${on ? " on" : ""}`} aria-hidden="true">{on && <Icon name="tick" size={16} />}</span>}
          </button>
        </li>
      })}
    </ul>
    {group && <div className="pane-footer"><button type="button" className="primary px" disabled={picked.length !== 2} onClick={() => onStart(picked)}>Create group</button></div>}
  </div>
}
