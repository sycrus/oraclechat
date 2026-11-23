/** Local birth time to UTC with the zone's historical rules, from the runtime's IANA data (ADR-0018). */
export type UtcBirth = { utc: Date; note?: "ambiguous" | "skipped" }

const DAY = 86_400_000
const formatters = new Map<string, Intl.DateTimeFormat>()

/** The zone's UTC offset, in milliseconds, at an instant. */
function offsetAt(instant: number, timeZone: string): number {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
    formatters.set(timeZone, format)
  }
  const part = Object.fromEntries(format.formatToParts(new Date(instant)).map(({ type, value }) => [type, Number(value)]))
  return Date.UTC(part.year!, part.month! - 1, part.day!, part.hour!, part.minute!, part.second!) - Math.floor(instant / 1000) * 1000
}

/**
 * Converts a wall-clock birth time in a zone to UTC. A time that happens twice takes the earlier
 * instant; a time skipped by a clock change moves forward by the gap. Both are noted.
 */
export function localToUtc(date: string, time: string, timeZone: string): UtcBirth {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number]
  const [hour, minute] = time.split(":").map(Number) as [number, number]
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  const before = offsetAt(wall - DAY, timeZone)
  const after = offsetAt(wall + DAY, timeZone)
  const matches = [...new Set([before, after, offsetAt(wall, timeZone)])]
    .map((offset) => wall - offset)
    .filter((instant) => wall - offsetAt(instant, timeZone) === instant)
    .sort((a, b) => a - b)
  if (matches.length > 1) return { utc: new Date(matches[0]!), note: "ambiguous" }
  if (matches.length === 1) return { utc: new Date(matches[0]!) }
  return { utc: new Date(wall - before), note: "skipped" }
}
