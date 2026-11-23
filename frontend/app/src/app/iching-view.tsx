"use client"

import React, { useState } from "react"
import { shortName, trigrams, type IChingLine, type IChingReading } from "../lib/iching"
import { ichingSuggestions } from "../lib/suggestions"
import { Icon } from "./icons"
import { AskChips, Sheet } from "./sheet"

const flip = (lines: IChingLine[]) => lines.map((line) => line.changing ? { ...line, yang: !line.yang, changing: false } : line)

/** Six stacked bars, top line first; changing lines in the accent colour. */
function Hexagram({ lines, label, size = "large" }: { lines: IChingLine[]; label?: string; size?: "large" | "small" }) {
  return <span className={`hexagram ${size}`} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
    {[...lines].reverse().map((line, index) => <span key={index} className={`iching-line ${line.yang ? "yang" : "yin"}${line.changing ? " is-changing" : ""}`}>{line.yang ? <i /> : <><i /><i /></>}</span>)}
  </span>
}

/**
 * A completed I Ching casting (iching spec: Casting validation and display): the primary → relating hexagram on a
 * card, and "Line by line" opening a sheet with meanings, trigrams, the changing lines and suggested questions.
 */
export function IChingCard({ reading, busy, onAsk, initialOpen = false }: { reading: IChingReading; busy: boolean; onAsk: (question: string) => void; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const changing = reading.lines.flatMap((line, index) => line.changing ? [index + 1] : [])
  const castAria = `Hexagram lines from the top: ${[...reading.lines].reverse().map((line) => `${line.yang ? "solid" : "broken"}${line.changing ? " changing" : ""}`).join(", ")}`
  const becoming = flip(reading.lines)
  const from = trigrams(reading.lines)
  const to = trigrams(becoming)
  return <section className="iching-card card px" aria-label="I Ching casting">
    <div className="card-pad">
      <span className="card-label">CAST · 6 OF 6</span>
      <div className={`iching-pair${reading.relating ? "" : " single"}`}>
        <div className="iching-figure">
          <Hexagram lines={reading.lines} label={castAria} />
          <span className="hex-number">{reading.primary.number}</span>
          <strong className="hex-name">{shortName(reading.primary.name)}</strong>
        </div>
        {reading.relating && <>
          <div className="iching-arrow" aria-hidden="true"><Icon name="arrow" /><small>{changing.length === 1 ? "line" : "lines"}<br />{changing.join(" · ")}</small></div>
          <div className="iching-figure">
            <Hexagram lines={becoming} />
            <span className="hex-number">{reading.relating.number}</span>
            <strong className="hex-name">{shortName(reading.relating.name)}</strong>
          </div>
        </>}
      </div>
      {!reading.relating && <p className="card-note">No changing lines: the cast holds as thrown.</p>}
    </div>
    <button type="button" className="card-action" onClick={() => setOpen(true)}><Icon name="list" size={16} />Line by line</button>
    {open && <Sheet title="The reading" onClose={() => setOpen(false)}>
      <div className="hex-rows">
        <HexRow lines={reading.lines} title={`${reading.primary.number} · ${reading.primary.name}`} sub={`${from.upper} over ${from.lower} · where you are`} meaning={reading.primary.meaning} />
        {reading.relating && <HexRow lines={becoming} title={`${reading.relating.number} · ${reading.relating.name}`} sub={`${to.upper} over ${to.lower} · where it leads`} meaning={reading.relating.meaning} />}
      </div>
      {changing.length > 0 && <div className="changing-lines">
        <span className="section-label">CHANGING LINES</span>
        <ul>{[...changing].reverse().map((place) => {
          const line = reading.lines[place - 1]!
          return <li key={place}>
            <span className={`iching-line ${line.yang ? "yang" : "yin"} is-changing`} aria-hidden="true">{line.yang ? <i /> : <><i /><i /></>}</span>
            <span>Line {place}{place === 6 ? " · top" : place === 1 ? " · base" : ""}</span>
            <span className="muted-text">{line.value} · {line.yang ? "yang → yin" : "yin → yang"}</span>
          </li>
        })}</ul>
      </div>}
      <AskChips label="ASK SAGE" questions={ichingSuggestions(reading)} busy={busy} onAsk={(question) => { setOpen(false); onAsk(question) }} />
    </Sheet>}
  </section>
}

function HexRow({ lines, title, sub, meaning }: { lines: IChingLine[]; title: string; sub: string; meaning: string }) {
  return <div className="hex-row px">
    <Hexagram lines={lines} size="small" />
    <div><strong>{title}</strong><small>{sub}</small><p>{meaning}</p></div>
  </div>
}
