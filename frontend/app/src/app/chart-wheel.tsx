"use client"

import React, { useState } from "react"
import { angleLabel, aspectLabel, PLANET_NAMES, placementLabel, pointName, SIGNS, signName, spreadLongitudes, transitLabel, wheelPoint, type AstrologyReading, type Planet } from "../lib/astrology"
import { chartSuggestions } from "../lib/suggestions"
import { Icon } from "./icons"
import { AskChips, Sheet } from "./sheet"

const round = (value: number) => Math.round(value * 100) / 100
const ABBREVIATIONS: Record<Planet, string> = { sun: "SU", moon: "MO", mercury: "ME", venus: "VE", mars: "MA", jupiter: "JU", saturn: "SA", uranus: "UR", neptune: "NE", pluto: "PL" }
const MARKER_GAP = 13

/** Marker longitudes nudged far enough apart that two-letter markers never overlap on the full wheel. */
export const markerLongitudes = (longitudes: number[]) => spreadLongitudes(longitudes, MARKER_GAP)

const line = (from: { x: number; y: number }, to: { x: number; y: number }) => `M${round(from.x)} ${round(from.y)}L${round(to.x)} ${round(to.y)}`
const spokes = (ascendant: number, inner: number, outer: number) =>
  SIGNS.map((_, index) => line(wheelPoint(index * 30, ascendant, inner), wheelPoint(index * 30, ascendant, outer))).join("")
const short = (sign: string) => sign.slice(0, 3).toUpperCase()

/**
 * Astra's chart in the chat (astrology spec: Chart validation and display): a summary card with a small wheel,
 * the Sun, Moon and ascendant, and the active transits; "Open full chart" opens the full view.
 */
export function ChartSummary({ reading, busy, onAsk, initialOpen = false }: { reading: AstrologyReading; busy: boolean; onAsk: (question: string) => void; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const { natal, transits } = reading
  const ascendant = natal.ascendant.longitude
  const sun = natal.planets.find((planet) => planet.point === "sun")!
  const moon = natal.planets.find((planet) => planet.point === "moon")!
  const dots = natal.planets.map((planet) => { const at = wheelPoint(planet.longitude, ascendant, 15); return `M${Math.round(at.x) - 1} ${Math.round(at.y) - 1}h2v2h-2z` }).join("")
  return <section className="chart-summary card px" aria-label="Birth chart">
    <div className="card-pad chart-top">
      <svg className="mini-wheel" width="112" height="112" viewBox="-28 -28 56 56" shapeRendering="crispEdges" role="img" aria-label={`Birth chart wheel, ${angleLabel("ascendant", natal.ascendant)}`}>
        <circle r="27" className="ring-outer" /><circle r="21" className="ring" /><circle r="9" className="ring-core" />
        <path d={spokes(ascendant, 9, 27)} className="spoke" />
        <path d={line({ x: 0, y: 0 }, wheelPoint(ascendant, ascendant, 27))} className="ascendant-line" />
        <path d={dots} className="planet-dot" />
      </svg>
      <div className="big-three">
        <span className="section-label">BIG THREE</span>
        <span><b className="tag px">SUN</b>{signName(sun.sign)} {Math.floor(sun.degree)}°</span>
        <span><b className="tag px">MOON</b>{signName(moon.sign)} {Math.floor(moon.degree)}°</span>
        <span><b className="tag px accent">ASC</b>{signName(natal.ascendant.sign)} {Math.floor(natal.ascendant.degree)}°</span>
      </div>
    </div>
    <div className="card-pad transits-strip">
      <span className="section-label">TRANSITS NOW · {transits.length}</span>
      {transits.length
        ? <div className="chips">{transits.slice(0, 2).map((transit) => <span key={`${transit.planet}-${transit.aspect}-${transit.natal}`} className="tag px">{PLANET_NAMES[transit.planet]} {transit.aspect} {pointName(transit.natal)}</span>)}{transits.length > 2 && <span className="tag px dim">+{transits.length - 2}</span>}</div>
        : <p className="card-note">No close transits right now.</p>}
      <ChartNote reading={reading} />
    </div>
    <button type="button" className="card-action" onClick={() => setOpen(true)}><Icon name="expand" size={16} />Open full chart</button>
    {open && <ChartView reading={reading} busy={busy} onAsk={(question) => { setOpen(false); onAsk(question) }} onClose={() => setOpen(false)} />}
  </section>
}

function ChartNote({ reading }: { reading: AstrologyReading }) {
  if (reading.note === "ambiguous") return <p className="card-note">Your birth time happened twice that day (clocks went back); the earlier one was used.</p>
  if (reading.note === "skipped") return <p className="card-note">Your birth time was skipped by a clock change that day; it was moved forward.</p>
  return null
}

type Tab = "placements" | "transits" | "aspects"

/** The full chart: the pixel wheel with selectable planets, and Placements, Transits and Aspects as text tabs. */
export function ChartView({ reading, busy, onAsk, onClose, initialSelected = "sun", initialTab = "placements" }: {
  reading: AstrologyReading
  busy: boolean
  onAsk: (question: string) => void
  onClose: () => void
  initialSelected?: Planet
  initialTab?: Tab
}) {
  const [selected, setSelected] = useState<Planet>(initialSelected)
  const [tab, setTab] = useState<Tab>(initialTab)
  const { natal, transits } = reading
  const ascendant = natal.ascendant.longitude
  const ascendantSign = Math.floor(ascendant / 30)
  const shown = markerLongitudes(natal.planets.map((planet) => planet.longitude))
  const pick = natal.planets.find((planet) => planet.point === selected) ?? natal.planets[0]!
  const ticks = natal.planets.map((planet) => { const at = wheelPoint(planet.longitude, ascendant, 39); return `M${Math.round(at.x)} ${Math.round(at.y)}h1v1h-1z` }).join("")
  const tabs: { id: Tab; label: string }[] = [{ id: "placements", label: "Placements" }, { id: "transits", label: `Transits ${transits.length}` }, { id: "aspects", label: `Aspects ${natal.aspects.length}` }]
  return <Sheet full title="Your chart" onClose={onClose} footer={<AskChips label="ASK ASTRA" questions={chartSuggestions(reading, pick.point)} busy={busy} onAsk={onAsk} />}>
    <p className="sheet-sub">{signName(natal.ascendant.sign)} rising · whole-sign houses</p>
    <div className="wheel-frame">
      <svg className="chart-wheel" width="300" height="300" viewBox="-50 -50 100 100" shapeRendering="crispEdges" role="img" aria-label={`Birth chart wheel, ${angleLabel("ascendant", natal.ascendant)}`}>
        <circle r="48" className="ring-outer" /><circle r="40" className="ring" /><circle r="28" className="ring" /><circle r="18" className="ring-core" />
        <path d={spokes(ascendant, 18, 48)} className="spoke" />
        <path d={line({ x: 0, y: 0 }, wheelPoint(natal.midheaven.longitude, ascendant, 48))} className="midheaven-line" />
        <line className="ascendant-line" x1={0} y1={0} x2={round(wheelPoint(ascendant, ascendant, 48).x)} y2={round(wheelPoint(ascendant, ascendant, 48).y)} />
        <path d={ticks} className="planet-dot" />
        {SIGNS.map((sign, index) => {
          const label = wheelPoint(index * 30 + 15, ascendant, 44)
          const house = wheelPoint(index * 30 + 15, ascendant, 23)
          return <g key={sign}>
            <text className={`sign-label${index === ascendantSign ? " rising" : ""}`} x={round(label.x)} y={round(label.y)}>{short(sign)}</text>
            <text className="house-number" x={round(house.x)} y={round(house.y)}>{((index - ascendantSign + 12) % 12) + 1}</text>
          </g>
        })}
      </svg>
      {natal.planets.map((planet, index) => {
        const at = wheelPoint(shown[index]!, ascendant, 34)
        return <button key={planet.point} type="button" className={`planet-marker px${planet.point === selected ? " on" : ""}`} aria-pressed={planet.point === selected} aria-label={placementLabel(planet)}
          style={{ left: `${round(150 + at.x * 3)}px`, top: `${round(150 + at.y * 3)}px` }} onClick={() => setSelected(planet.point)}>{ABBREVIATIONS[planet.point]}</button>
      })}
    </div>
    <p className="selected-planet px" aria-live="polite"><b className="tag px accent">{ABBREVIATIONS[pick.point]}</b>{placementLabel(pick)}</p>
    <div className="tabs" role="tablist" aria-label="Chart details">
      {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "on" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    <div role="tabpanel" className="tab-panel">
      {tab === "placements" && <ul className="chart-rows">
        {natal.planets.map((planet) => <li key={planet.point}><b className="tag px" aria-hidden="true">{ABBREVIATIONS[planet.point]}</b><span>{placementLabel(planet)}</span></li>)}
        <li><b className="tag px accent" aria-hidden="true">AS</b><span>{angleLabel("Ascendant", natal.ascendant)}</span></li>
        <li><b className="tag px" aria-hidden="true">MC</b><span>{angleLabel("Midheaven", natal.midheaven)}</span></li>
      </ul>}
      {tab === "transits" && (transits.length
        ? <ul className="chart-rows">{transits.map((transit) => <li key={`${transit.planet}-${transit.aspect}-${transit.natal}`} className="transit-row">
            <span>{transitLabel(transit)}</span>
            <span className="orb-bar" aria-hidden="true"><i style={{ width: `${Math.max(8, Math.round((1 - transit.orb / 3) * 100))}%` }} /></span>
          </li>)}</ul>
        : <p className="card-note">No close transits right now.</p>)}
      {tab === "aspects" && (natal.aspects.length
        ? <ul className="chart-rows">{natal.aspects.map((aspect) => <li key={`${aspect.a}-${aspect.b}`}><span>{aspectLabel(aspect)}</span></li>)}</ul>
        : <p className="card-note">No major aspects.</p>)}
    </div>
  </Sheet>
}
