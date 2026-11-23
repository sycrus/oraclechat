"use client"

import React from "react"
import type { CallCards, CallPanelContent } from "../../lib/call/reading"
import type { BirthDetailsSubmission, Place } from "../../lib/birth-form"
import type { InteractionAction } from "../chat-view"
import { BirthInvite } from "../birth-invite"
import { CardFan } from "../card-fan"
import { ChartSummary } from "../chart-wheel"
import { CoinToss } from "../coin-toss"
import { IChingCard } from "../iching-view"
import { positionLabel, signatureLabels } from "../message-body"
import { pixelTarot } from "../../lib/pixel-tarot"
import { PixelGrid } from "../pixel-grid"

/**
 * A reading in the call's message panel (voice-calls: Interactive readings in a call): the chat's own interactive
 * cards while open, then a compact result. Actions go back through `onInteract`, sent with the call flag.
 */
export function CallPanel({ tellerName, panel, busy, onInteract, onAsk, searchPlaces }: {
  tellerName: string
  panel: CallPanelContent
  busy: boolean
  onInteract: (action: InteractionAction) => Promise<void> | void
  onAsk: (question: string) => void
  searchPlaces: (query: string) => Promise<Place[]>
}) {
  switch (panel.kind) {
    case "fan": return <CardFan fan={panel.fan} busy={busy} onPick={(index) => void onInteract({ action: "pick", index })} onUnpick={(index) => void onInteract({ action: "unpick", index })} onReveal={() => void onInteract({ action: "reveal" })} />
    case "toss": return <CoinToss toss={panel.toss} busy={busy} onToss={() => void onInteract({ action: "toss", after: panel.toss.lines.length })} />
    case "form": return <BirthInvite state={panel.state} busy={busy} searchPlaces={searchPlaces} onSubmit={async (details: BirthDetailsSubmission) => { await onInteract({ action: "submit", details }) }} />
    case "cards": return <CardStrip tellerName={tellerName} cards={panel.cards} />
    case "iching": return <IChingCard reading={panel.reading} busy={busy} onAsk={onAsk} />
    case "chart": return <ChartSummary reading={panel.reading} busy={busy} onAsk={onAsk} />
    case "note": return <p className="call-note px" role="status">{panel.note}</p>
  }
}

function CardStrip({ tellerName, cards }: { tellerName: string; cards: CallCards }) {
  const shown = [
    ...cards.spread.cards.map((card) => ({ ...card, label: positionLabel(card.position) })),
    ...(cards.signature ? [{ ...cards.signature, label: signatureLabels[cards.signature.position] }] : []),
  ]
  return <section className="call-cards" aria-label={`Cards ${tellerName} drew`}>
    {shown.map((card) => <figure key={card.artKey} className="call-card">
      <PixelGrid art={pixelTarot(card.artKey)} label={`${card.name}, ${card.orientation}`} className={`pixel-card${card.orientation === "reversed" ? " reversed" : ""}`} />
      <figcaption><small>{card.label}</small><strong>{card.name}</strong><em>{card.orientation}</em></figcaption>
    </figure>)}
  </section>
}
