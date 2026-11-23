/** Astra's chart as the browser sees it (astrology spec). The app computes it; the browser only validates and shows it. */
export const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const
export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const
export const ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"] as const
const TRANSIT_PLANETS = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const

export type Planet = (typeof PLANETS)[number]
export type Sign = (typeof SIGNS)[number]
export type AspectName = (typeof ASPECTS)[number]
export type ChartPoint = Planet | "ascendant" | "midheaven"
export type ChartAngle = { longitude: number; sign: Sign; degree: number }
export type Placement = ChartAngle & { point: Planet; house: number; retrograde: boolean }
export type NatalAspect = { a: ChartPoint; b: ChartPoint; aspect: AspectName; orb: number }
export type Transit = { planet: (typeof TRANSIT_PLANETS)[number]; aspect: AspectName; natal: ChartPoint; orb: number; house: number }
export interface AstrologyReading {
  method: "natal-transits"
  computedAt: string
  natal: { planets: Placement[]; ascendant: ChartAngle; midheaven: ChartAngle; aspects: NatalAspect[] }
  transits: Transit[]
  note?: "ambiguous" | "skipped"
}

/** Traditional names and glyphs (shown as text; the wheel uses the glyphs). */
export const PLANET_NAMES: Record<Planet, string> = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto" }
export const PLANET_GLYPHS: Record<Planet, string> = { sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂", jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇" }
export const SIGN_GLYPHS: Record<Sign, string> = { aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓" }

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"]
const POINTS = new Set<string>([...PLANETS, "ascendant", "midheaven"])
const capitalize = (word: string) => word[0]!.toUpperCase() + word.slice(1)

export const signName = (sign: Sign) => capitalize(sign)
export const pointName = (point: ChartPoint) => point === "ascendant" || point === "midheaven" ? capitalize(point) : PLANET_NAMES[point]
export const houseName = (house: number) => `${ORDINALS[house - 1]} house`
const orbText = (orb: number) => `orb ${orb.toFixed(1)}°`

export const placementLabel = (p: Placement) => `${PLANET_NAMES[p.point]} in ${signName(p.sign)}, ${Math.floor(p.degree)}°, ${houseName(p.house)}${p.retrograde ? ", retrograde" : ""}`
export const angleLabel = (name: string, angle: ChartAngle) => `${name} in ${signName(angle.sign)}, ${Math.floor(angle.degree)}°`
export const aspectLabel = (a: NatalAspect) => `${pointName(a.a)} ${a.aspect} ${pointName(a.b)}, ${orbText(a.orb)}`
export const transitLabel = (t: Transit) => `${PLANET_NAMES[t.planet]} ${t.aspect} your ${pointName(t.natal)}, ${orbText(t.orb)}, through your ${houseName(t.house)}`

type Loose = Record<string, unknown>
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const isHouse = (value: unknown) => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 12
const includes = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value)

function parseAngle(value: unknown): ChartAngle | null {
  if (!isObject(value) || !isNumber(value.longitude) || value.longitude < 0 || value.longitude >= 360) return null
  if (!includes(SIGNS, value.sign) || !isNumber(value.degree) || value.degree < 0 || value.degree >= 30) return null
  return { longitude: value.longitude, sign: value.sign, degree: value.degree }
}

function parsePlacement(value: unknown): Placement | null {
  const angle = parseAngle(value)
  if (!angle || !isObject(value) || !includes(PLANETS, value.point) || !isHouse(value.house) || typeof value.retrograde !== "boolean") return null
  return { point: value.point, ...angle, house: value.house as number, retrograde: value.retrograde }
}

function parseAspect(value: unknown): NatalAspect | null {
  if (!isObject(value) || !POINTS.has(value.a as string) || !POINTS.has(value.b as string) || !includes(ASPECTS, value.aspect) || !isNumber(value.orb) || value.orb < 0) return null
  return { a: value.a as ChartPoint, b: value.b as ChartPoint, aspect: value.aspect, orb: value.orb }
}

function parseTransit(value: unknown): Transit | null {
  if (!isObject(value) || !includes(TRANSIT_PLANETS, value.planet) || !includes(ASPECTS, value.aspect) || !POINTS.has(value.natal as string)
      || !isNumber(value.orb) || value.orb < 0 || !isHouse(value.house)) return null
  return { planet: value.planet, aspect: value.aspect, natal: value.natal as ChartPoint, orb: value.orb, house: value.house as number }
}

/** Validates chart data from the server; anything off is rejected and the teller's prose shows alone. */
export function parseAstrologyReading(value: unknown): AstrologyReading | null {
  if (!isObject(value) || value.method !== "natal-transits" || typeof value.computedAt !== "string" || !isObject(value.natal)) return null
  if (value.note !== undefined && value.note !== "ambiguous" && value.note !== "skipped") return null
  const natal = value.natal
  if (!Array.isArray(natal.planets) || !Array.isArray(natal.aspects) || !Array.isArray(value.transits)) return null
  const planets = natal.planets.map(parsePlacement)
  if (planets.length !== PLANETS.length || planets.some((p) => !p) || new Set(planets.map((p) => p!.point)).size !== PLANETS.length) return null
  const ascendant = parseAngle(natal.ascendant)
  const midheaven = parseAngle(natal.midheaven)
  const aspects = natal.aspects.map(parseAspect)
  const transits = value.transits.map(parseTransit)
  if (!ascendant || !midheaven || aspects.some((a) => !a) || transits.some((t) => !t)) return null
  return {
    method: "natal-transits",
    computedAt: value.computedAt,
    natal: { planets: planets as Placement[], ascendant, midheaven, aspects: aspects as NatalAspect[] },
    transits: transits as Transit[],
    ...(value.note ? { note: value.note } : {}),
  }
}

/** A point on the wheel: the ascendant sits at 9 o'clock and the zodiac runs counter-clockwise (SVG y grows downward). */
export function wheelPoint(longitude: number, ascendant: number, radius: number): { x: number; y: number } {
  const angle = (180 + longitude - ascendant) * Math.PI / 180
  return { x: radius * Math.cos(angle), y: -radius * Math.sin(angle) }
}

/** Display longitudes with crowded planets nudged at least `gap` degrees apart, in their original order. */
export function spreadLongitudes(longitudes: number[], gap: number): number[] {
  const order = longitudes.map((longitude, index) => ({ longitude, index })).sort((a, b) => a.longitude - b.longitude)
  const shown = [...longitudes]
  order.forEach((entry, position) => {
    const previous = order[position - 1]
    shown[entry.index] = previous && entry.longitude - shown[previous.index]! < gap ? shown[previous.index]! + gap : entry.longitude
  })
  return shown
}
