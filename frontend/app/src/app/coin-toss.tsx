"use client"

import React, { useState } from "react"
import { becomingLines, coinFaces, lineLabel, throwLabel, type CoinToss as Toss, type TossLine } from "../lib/toss"
import { Icon } from "./icons"

/** One line bar: solid for yang, broken for yin, with its changing mark when it has one. */
function LineBar({ line, className, ariaLabel, muted }: { line: TossLine; className?: string; ariaLabel?: string; muted?: boolean }) {
  return (
    <span
      className={`iching-line ${line.yang ? "yang" : "yin"}${line.changing ? " changing" : ""}${muted ? " muted" : ""}${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      {line.yang
        ? <i className="line-solid" aria-hidden="true" />
        : <span className="line-broken" aria-hidden="true"><i /><i /></span>}
      {line.changing && <span className="changing-mark" aria-hidden="true" />}
    </span>
  )
}

/**
 * Sage's coin toss (ADR-0017), as one compact card (interactive-readings: Compact coin toss card). The cast is server
 * state; each row shows a line as thrown, its coins and value, and what it becomes.
 */
export function CoinToss({ toss, busy, onToss, initialHelp = false }: {
  toss: Toss
  busy: boolean
  onToss: () => void
  initialHelp?: boolean
}) {
  const [help, setHelp] = useState(initialHelp)
  const open = toss.state === "casting"
  const total = 6
  const tossed = toss.lines.length
  const becoming = becomingLines(toss.lines)
  return (
    <div className="coin-toss card px" role="group" aria-label="I Ching coin cast">
      <div className="card-head">
        <span className="card-label">COIN CAST</span>
        <span className="toss-progress" aria-hidden="true">
          <span className="pips">{Array.from({ length: total }, (_, index) => <span key={index} className={index < tossed ? "pip on" : "pip"} />)}</span>
          <span>{`${tossed} of ${total}`}</span>
        </span>
      </div>
      <p className="sr-only" aria-live="polite">{`${tossed} of ${total} lines tossed`}</p>
      <div className="cast-headers" aria-hidden="true">
        <span className="cast-header">FROM</span>
        <span className="cast-header">COINS</span>
        <span className="cast-header">BECOMING</span>
      </div>
      <div className="cast-lines">
        {Array.from({ length: total }, (_, index) => {
          const place = total - index // display top to bottom: line 6 first, line 1 last
          const line = toss.lines[place - 1]
          if (!line) return <div key={place} className="toss-line"><span className="iching-line pending" aria-hidden="true" /><span className="toss-outcome pending-label">line {place}</span><span className="iching-line pending" aria-hidden="true" /></div>
          return (
            <div key={place} className={`toss-line${place === tossed ? " latest" : ""}`}>
              <LineBar line={line} ariaLabel={lineLabel(place, total, line)} />
              <span className="toss-outcome">
                <span className="toss-coins-landed" aria-hidden="true">
                  {coinFaces(line.value).map((face, coin) => <b key={coin} className={face === 3 ? "coin heads" : "coin tails"} />)}
                </span>
                <span className={`toss-value${line.changing ? " changing" : ""}`} aria-hidden="true">{line.value}</span>
                <small className="sr-only">{throwLabel(line.value)}</small>
              </span>
              <LineBar line={becoming[place - 1]!} className="becoming" muted={!line.changing} />
            </div>
          )
        })}
      </div>
      {open
        ? <div className="toss-actions">
            <button type="button" className="primary px toss-coins" disabled={busy} onClick={onToss}><Icon name="coin" />Toss the coins</button>
            <button type="button" className="secondary px toss-help" aria-label="How the coins count" aria-expanded={help} onClick={() => setHelp((shown) => !shown)}>?</button>
          </div>
        : toss.state === "set-aside"
          ? <p className="card-note">This cast was set aside.</p>
          : null}
      {help && <p className="toss-legend">Coins land heads (filled centre, counts 3) or tails (open centre, counts 2). Three coins make one line, and a 6 or 9 is changing: it shows in gold and flips in the becoming cast.</p>}
    </div>
  )
}
