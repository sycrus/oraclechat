/** The only module that talks to the ephemeris library (ADR-0018). Longitudes are tropical, of date, in degrees. */
import * as Astronomy from "astronomy-engine"

export const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const
export type Planet = (typeof PLANETS)[number]

const BODIES: Record<Exclude<Planet, "sun" | "moon">, Astronomy.Body> = {
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto,
}

const HALF_DAY = 43_200_000
const toRadians = (degrees: number) => degrees * Math.PI / 180
const normalize = (degrees: number) => ((degrees % 360) + 360) % 360

/** The planet's apparent geocentric ecliptic longitude at an instant. */
export function eclipticLongitude(planet: Planet, instant: Date): number {
  if (planet === "sun") return normalize(Astronomy.SunPosition(instant).elon)
  if (planet === "moon") return normalize(Astronomy.EclipticGeoMoon(instant).lon)
  return normalize(Astronomy.Ecliptic(Astronomy.GeoVector(BODIES[planet], instant, true)).elon)
}

/** True when the planet's longitude is decreasing around the instant. */
export function isRetrograde(planet: Planet, instant: Date): boolean {
  if (planet === "sun" || planet === "moon") return false
  const before = eclipticLongitude(planet, new Date(instant.getTime() - HALF_DAY))
  const after = eclipticLongitude(planet, new Date(instant.getTime() + HALF_DAY))
  return ((after - before + 540) % 360) - 180 < 0
}

/** Ascendant and midheaven longitudes for a place (latitude, east longitude) at an instant. */
export function ascendantAndMidheaven(instant: Date, latitude: number, longitude: number): { ascendant: number; midheaven: number } {
  const time = Astronomy.MakeTime(instant)
  const tilt = toRadians(Astronomy.e_tilt(time).tobl)
  const ramc = toRadians(normalize(Astronomy.SiderealTime(time) * 15 + longitude))
  const midheaven = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(tilt))
  const ascendant = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(tilt) + Math.tan(toRadians(latitude)) * Math.sin(tilt)))
  return { ascendant: normalize(ascendant * 180 / Math.PI), midheaven: normalize(midheaven * 180 / Math.PI) }
}
