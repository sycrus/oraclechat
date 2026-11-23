/** Offline birth-place lookup over the bundled GeoNames extract (ADR-0018); no network access. */
import { readFileSync } from "node:fs"

export type Place = { id: number; name: string; region: string; country: string; latitude: number; longitude: number; timeZone: string }
type Row = [id: number, name: string, asciiName: string, region: string, country: string, latitude: number, longitude: number, timeZone: string, population: number]
type Indexed = { place: Place; keys: string[] }

const LIMIT = 10
const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()

let index: { list: Indexed[]; byId: Map<number, Place> } | undefined

/** Loaded on first use: rows are already sorted by population, biggest first. */
function load() {
  if (index) return index
  // Same relative path from src/astrology and dist/astrology.
  const rows = JSON.parse(readFileSync(new URL("../../data/places.json", import.meta.url), "utf8")) as Row[]
  const list = rows.map(([id, name, asciiName, region, country, latitude, longitude, timeZone]) => ({
    place: { id, name, region, country, latitude, longitude, timeZone },
    keys: [...new Set([normalize(name), normalize(asciiName || name)])],
  }))
  index = { list, byId: new Map(list.map(({ place }) => [place.id, place])) }
  return index
}

/** Cities whose name starts with the query, ignoring case and accents, biggest first. */
export function searchPlaces(query: string): Place[] {
  const prefix = normalize(query)
  if (prefix.length < 2) return []
  const matches: Place[] = []
  for (const { place, keys } of load().list) {
    if (keys.some((key) => key.startsWith(prefix))) matches.push(place)
    if (matches.length === LIMIT) break
  }
  return matches
}

export function getPlace(id: number): Place | undefined {
  return load().byId.get(id)
}
