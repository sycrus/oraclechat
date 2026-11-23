"use client"

import React, { useState } from "react"
import type { BirthDetailsSubmission, Place } from "../lib/birth-form"
import { BirthDetailsForm } from "./birth-details-form"
import { Icon } from "./icons"
import { Sheet } from "./sheet"

/**
 * Astra's birth-details message (birth-details spec: Inline birth-details form): a small card in the chat whose
 * button opens the form full screen. The details never come back into the chat.
 */
export function BirthInvite({ state, busy, onSubmit, searchPlaces, initialOpen = false }: {
  state: "open" | "submitted" | "set-aside"
  busy: boolean
  onSubmit: (details: BirthDetailsSubmission) => Promise<void>
  searchPlaces: (query: string) => Promise<Place[]>
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen && state === "open")
  return <section className="birth-invite card px" aria-label="Birth details request">
    <div className="card-pad invite-body">
      <span className="invite-icon" aria-hidden="true"><Icon name="astra" size={32} /></span>
      <span className="invite-copy"><strong>Birth details</strong><small>Date, time and place · saved on this computer</small></span>
    </div>
    {state === "open" && <button type="button" className="card-action" disabled={busy} onClick={() => setOpen(true)}><Icon name="form" size={16} />Add birth details</button>}
    {state === "submitted" && <span className="card-action done"><Icon name="tick" size={16} />Submitted</span>}
    {state === "set-aside" && <span className="card-action done">This form was set aside for a newer one.</span>}
    {open && <Sheet full title="Birth details" onClose={() => setOpen(false)}>
      <BirthDetailsForm searchPlaces={searchPlaces} disabled={busy} onSubmit={async (details) => { await onSubmit(details); setOpen(false) }} />
    </Sheet>}
  </section>
}
