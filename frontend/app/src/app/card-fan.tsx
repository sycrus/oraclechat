import React from "react"
import { cardsNeeded, fanCardLabel, type CardFan as Fan } from "../lib/fan"

/** Mira's fan of face-down cards (ADR-0017). Picks are server state; this only shows them and reports what the user does. */
/**
 * A pixel tarot card back on a 10×16 grid: a thin inner frame, a star at the centre, and corner pips. Colours come
 * from the card's CSS variables, so a picked card can invert them.
 */
function CardBack() {
  const trim = "var(--card-trim)"
  return <svg className="card-back" viewBox="0 0 10 16" shapeRendering="crispEdges" aria-hidden="true">
    <rect width="10" height="16" fill="var(--card-edge)" />
    <rect x="1" y="1" width="8" height="14" fill="var(--card-back)" />
    <path d="M1 1h8v1H1zM1 14h8v1H1zM1 2h1v12H1zM8 2h1v12H8z" fill={trim} />
    <path d="M4 5h2v1H4zM3 6h4v4H3zM4 10h2v1H4z" fill={trim} />
    <path d="M4 7h2v2H4z" fill="var(--card-ink)" />
    <path d="M3 3h1v1H3zM6 3h1v1H6zM3 12h1v1H3zM6 12h1v1H6z" fill={trim} />
  </svg>
}

export function CardFan({ fan, busy, onPick, onUnpick, onReveal }: {
  fan: Fan
  busy: boolean
  onPick: (index: number) => void
  onUnpick: (index: number) => void
  onReveal: () => void
}) {
  const needed = cardsNeeded(fan.spread)
  const open = fan.state === "open"
  return (
    <div className="card-fan" role="group" aria-label="Fan of face-down tarot cards">
      <div className="fan-cards">
        {Array.from({ length: fan.size }, (_, index) => {
          const picked = fan.picks.includes(index)
          return <button key={index} type="button" className={`fan-card${picked ? " picked" : ""}`} aria-label={fanCardLabel(index, fan.size, picked)} disabled={!open || busy} onClick={() => (picked ? onUnpick(index) : onPick(index))}><CardBack /></button>
        })}
      </div>
      {open
        ? <>
            <p className="fan-count" aria-live="polite">{`${fan.picks.length} of ${needed} picked`}</p>
            <button type="button" className="fan-reveal" disabled={busy || fan.picks.length !== needed} onClick={onReveal}>Reveal the cards</button>
          </>
        : <p className="fan-set-aside">This fan was set aside.</p>}
    </div>
  )
}
