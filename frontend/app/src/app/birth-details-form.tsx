"use client"

import React, { useEffect, useId, useState, type FormEvent } from "react"
import { placeLabel, type BirthDetailsSubmission, type Place } from "../lib/birth-form"

export interface BirthDetailsFormProps {
  onSubmit: (details: BirthDetailsSubmission) => Promise<void>
  searchPlaces: (query: string) => Promise<Place[]>
  initial?: { date: string; time: string; place: Place }
  disabled?: boolean
  /** Shown instead of the button row, e.g. when the form was set aside. */
  note?: string
  error?: string
  submitLabel?: string
}

/** Birth date, time and place with explicit consent (ADR-0018). Used inline under Astra's invitation and in the privacy panel. */
export function BirthDetailsForm({ onSubmit, searchPlaces, initial, disabled = false, note, error: givenError, submitLabel = "Read my chart" }: BirthDetailsFormProps) {
  const id = useId()
  const [date, setDate] = useState(initial?.date ?? "")
  const [time, setTime] = useState(initial?.time ?? "")
  const [place, setPlace] = useState<Place | null>(initial?.place ?? null)
  const [query, setQuery] = useState(initial ? placeLabel(initial.place) : "")
  const [matches, setMatches] = useState<Place[]>([])
  const [highlight, setHighlight] = useState(0)
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(givenError ?? "")

  useEffect(() => {
    if (place && query === placeLabel(place)) { setMatches([]); return }
    if (query.trim().length < 2) { setMatches([]); return }
    let cancelled = false
    const timer = setTimeout(() => { void searchPlaces(query).then((found) => { if (!cancelled) { setMatches(found); setHighlight(0) } }).catch(() => undefined) }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, place, searchPlaces])

  const choose = (chosen: Place) => { setPlace(chosen); setQuery(placeLabel(chosen)); setMatches([]) }
  const ready = Boolean(date && time && place && consent) && !sending && !disabled

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready || !place) return
    setSending(true); setError("")
    try { await onSubmit({ date, time, placeId: place.id, consent: true }) } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't save your birth details.") } finally { setSending(false) }
  }

  const listId = `${id}-places`
  return <form className="birth-form" onSubmit={(event) => void submit(event)} aria-label="Birth details">
    <fieldset disabled={disabled || sending}>
      <div className="birth-fields">
        <label><span>Birth date</span><input type="date" value={date} min="1800-01-01" max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required /></label>
        <label><span>Birth time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
        <label className="birth-place"><span>Birth place</span>
          <input type="text" role="combobox" aria-autocomplete="list" aria-expanded={matches.length > 0} aria-controls={listId}
            aria-activedescendant={matches.length ? `${listId}-${highlight}` : undefined} value={query} placeholder="Start typing a town or city" autoComplete="off"
            onChange={(event) => { setQuery(event.target.value); setPlace(null) }}
            onKeyDown={(event) => {
              if (!matches.length) return
              if (event.key === "ArrowDown") { event.preventDefault(); setHighlight((index) => (index + 1) % matches.length) }
              else if (event.key === "ArrowUp") { event.preventDefault(); setHighlight((index) => (index - 1 + matches.length) % matches.length) }
              else if (event.key === "Enter") { event.preventDefault(); choose(matches[highlight]!) }
              else if (event.key === "Escape") setMatches([])
            }} />
          {matches.length > 0 && <ul id={listId} role="listbox" className="place-options">{matches.map((match, index) =>
            <li key={match.id} id={`${listId}-${index}`} role="option" aria-selected={index === highlight} onMouseDown={(event) => { event.preventDefault(); choose(match) }}>{placeLabel(match)}</li>)}</ul>}
        </label>
      </div>
      <label className="birth-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>Save my birth details on this computer for Astra’s readings. Only the computed chart is shared with tellers, and you can delete the details any time.</span></label>
      {note ? <p className="birth-note">{note}</p> : <button type="submit" disabled={!ready}>{sending ? "Saving…" : submitLabel}</button>}
      {error && <p className="birth-error" role="alert">{error}</p>}
      <small className="birth-credit">Places © <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a>, CC BY 4.0</small>
    </fieldset>
  </form>
}
