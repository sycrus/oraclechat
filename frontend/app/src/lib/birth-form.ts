/** The birth-details form kind and places, as the browser sees them (birth-details spec). The form never carries the details. */
export interface BirthForm {
  kind: "birth-details"
  state: "open" | "submitted" | "set-aside"
}

export interface Place { id: number; name: string; region: string; country: string; latitude: number; longitude: number; timeZone: string }

/** What the user submits: the details plus the explicit consent the backend requires. */
export interface BirthDetailsSubmission { date: string; time: string; placeId: number; consent: true }

const STATES = new Set(["open", "submitted", "set-aside"])

export function parseBirthForm(value: unknown): BirthForm | null {
  if (!value || typeof value !== "object") return null
  const form = value as Record<string, unknown>
  if (form.kind !== "birth-details" || typeof form.state !== "string" || !STATES.has(form.state)) return null
  return { kind: "birth-details", state: form.state as BirthForm["state"] }
}

const isPlace = (value: unknown): value is Place => {
  if (!value || typeof value !== "object") return false
  const place = value as Record<string, unknown>
  return typeof place.id === "number" && typeof place.name === "string" && typeof place.region === "string" && typeof place.country === "string"
    && typeof place.latitude === "number" && typeof place.longitude === "number" && typeof place.timeZone === "string"
}

export function parsePlaces(value: unknown): Place[] {
  const places = value && typeof value === "object" ? (value as { places?: unknown }).places : undefined
  return Array.isArray(places) ? places.filter(isPlace) : []
}

export const placeLabel = (place: Place) => [place.name, place.region, place.country].filter(Boolean).join(", ")
