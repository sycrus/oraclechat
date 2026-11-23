/** App-owned natal chart and transits (ADR-0013, ADR-0018): tropical zodiac, whole-sign houses, major aspects. */
import { ascendantAndMidheaven, eclipticLongitude, isRetrograde, PLANETS, type Planet } from "./ephemeris.js"
import { localToUtc } from "./time.js"

export { PLANETS, type Planet }

export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const
export type Sign = (typeof SIGNS)[number]

export const ASPECTS = [
  { aspect: "conjunction", angle: 0, orb: 8 },
  { aspect: "sextile", angle: 60, orb: 6 },
  { aspect: "square", angle: 90, orb: 8 },
  { aspect: "trine", angle: 120, orb: 8 },
  { aspect: "opposition", angle: 180, orb: 8 },
] as const
export type AspectName = (typeof ASPECTS)[number]["aspect"]

export const TRANSIT_PLANETS = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const satisfies readonly Planet[]
export const TRANSIT_ORB = 2

export type ChartPoint = Planet | "ascendant" | "midheaven"
export type ChartAngle = { longitude: number; sign: Sign; degree: number }
export type Placement = ChartAngle & { point: Planet; house: number; retrograde: boolean }
export type NatalAspect = { a: ChartPoint; b: ChartPoint; aspect: AspectName; orb: number }
export type Transit = { planet: (typeof TRANSIT_PLANETS)[number]; aspect: AspectName; natal: ChartPoint; orb: number; house: number }

export type AstrologyReading = {
  method: "natal-transits"
  computedAt: string
  natal: { planets: Placement[]; ascendant: ChartAngle; midheaven: ChartAngle; aspects: NatalAspect[] }
  transits: Transit[]
  /** Set when the birth time happened twice or not at all on the birth date. */
  note?: "ambiguous" | "skipped"
}

export type BirthInput = { date: string; time: string; place: { latitude: number; longitude: number; timeZone: string } }

const round = (value: number) => Math.round(value * 100) / 100
const separation = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

function angleAt(longitude: number): ChartAngle {
  const signIndex = Math.floor(longitude / 30) % 12
  return { longitude: round(longitude), sign: SIGNS[signIndex]!, degree: Math.min(round(longitude - signIndex * 30), 29.99) }
}

const houseOf = (longitude: number, ascendant: number) => ((Math.floor(longitude / 30) - Math.floor(ascendant / 30) + 12) % 12) + 1

/** The major aspect between two longitudes, if one is within its orb (or within `maxOrb`, for transits). */
export function findAspect(a: number, b: number, maxOrb?: number): { aspect: AspectName; orb: number } | undefined {
  const apart = separation(a, b)
  for (const { aspect, angle, orb } of ASPECTS) {
    const off = Math.abs(apart - angle)
    if (off <= (maxOrb ?? orb)) return { aspect, orb: round(off) }
  }
  return undefined
}

/** Computes the natal chart for the birth and the transits at `now`. */
export function computeChart(birth: BirthInput, now: Date): AstrologyReading {
  const { utc, note } = localToUtc(birth.date, birth.time, birth.place.timeZone)
  const angles = ascendantAndMidheaven(utc, birth.place.latitude, birth.place.longitude)
  const planets: Placement[] = PLANETS.map((point) => {
    const longitude = eclipticLongitude(point, utc)
    return { point, ...angleAt(longitude), house: houseOf(longitude, angles.ascendant), retrograde: isRetrograde(point, utc) }
  })
  const points: Array<{ point: ChartPoint; longitude: number }> = [
    ...planets.map(({ point, longitude }) => ({ point, longitude })),
    { point: "ascendant", longitude: angles.ascendant },
    { point: "midheaven", longitude: angles.midheaven },
  ]
  const aspects: NatalAspect[] = []
  points.forEach((first, index) => {
    for (const second of points.slice(index + 1)) {
      if (first.point === "ascendant" && second.point === "midheaven") continue
      const found = findAspect(first.longitude, second.longitude)
      if (found) aspects.push({ a: first.point, b: second.point, ...found })
    }
  })
  const transits: Transit[] = TRANSIT_PLANETS.flatMap((planet) => {
    const longitude = eclipticLongitude(planet, now)
    return points.flatMap(({ point, longitude: natal }) => {
      const found = findAspect(longitude, natal, TRANSIT_ORB)
      return found ? [{ planet, aspect: found.aspect, natal: point, orb: found.orb, house: houseOf(longitude, angles.ascendant) }] : []
    })
  }).sort((a, b) => a.orb - b.orb)
  return {
    method: "natal-transits",
    computedAt: now.toISOString(),
    natal: { planets, ascendant: angleAt(angles.ascendant), midheaven: angleAt(angles.midheaven), aspects },
    transits,
    ...(note ? { note } : {}),
  }
}
