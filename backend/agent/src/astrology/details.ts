/** Validation of a birth-details save request (birth-details spec, ADR-0018). */
import { getPlace } from "./places.js"

export type BirthProfile = { date: string; time: string; placeId: number }

export class BirthDetailsError extends Error {}

/** Parses `{ date, time, placeId, consent: true }`; consent must be the literal `true`. */
export function parseBirthDetails(body: unknown, today = new Date()): BirthProfile {
  const { date, time, placeId, consent } = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>
  if (consent !== true) throw new BirthDetailsError("consent to save birth details is required")
  const dateMatch = typeof date === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null
  const [year, month, day] = dateMatch ? dateMatch.slice(1).map(Number) as [number, number, number] : [0, 0, 0]
  const calendar = new Date(Date.UTC(year, month - 1, day))
  const real = dateMatch && calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day
  if (!real || year < 1800 || calendar.getTime() > today.getTime()) throw new BirthDetailsError("date must be a real date from 1800 to today, as YYYY-MM-DD")
  const timeMatch = typeof time === "string" ? /^(\d{2}):(\d{2})$/.exec(time) : null
  if (!timeMatch || Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59) throw new BirthDetailsError("time must be HH:MM from 00:00 to 23:59")
  if (typeof placeId !== "number" || !getPlace(placeId)) throw new BirthDetailsError("place must be chosen from the place list")
  return { date: date as string, time: time as string, placeId }
}
