/**
 * The only place a chart becomes teller text (ADR-0018). It never includes birth details, and the
 * coarse view, used for hosted replies without sharing, leaves out degrees and orbs.
 */
import { astrologyCatalog } from "./catalog.js"
import type { AstrologyReading, ChartAngle, ChartPoint, Placement } from "./chart.js"

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"]
const pointName = (point: ChartPoint) => point === "ascendant" ? "Ascendant" : point === "midheaven" ? "Midheaven" : astrologyCatalog.planets[point].name
const signName = (angle: ChartAngle) => astrologyCatalog.signs[angle.sign].name
const house = (number: number) => `${ORDINALS[number - 1]} house`

export function chartForTeller(reading: AstrologyReading, { precise }: { precise: boolean }): string {
  const at = (angle: ChartAngle) => `${signName(angle)}${precise ? ` ${angle.degree}°` : ""}`
  const placement = (p: Placement) => `${pointName(p.point)} in ${at(p)}${p.retrograde ? " (retrograde)" : ""}, ${house(p.house)}`
  const orb = (value: number) => precise ? ` (orb ${value}°)` : ""
  const { natal, transits } = reading
  const transitPlanets = new Set(transits.map((t) => t.planet))
  const transitHouses = new Set(transits.map((t) => t.house))
  const aspectNames = new Set([...transits.map((t) => t.aspect), ...natal.aspects.map((a) => a.aspect)])
  return [
    `Natal chart (tropical zodiac, whole-sign houses):`,
    ...natal.planets.map((p) => `- ${placement(p)}`),
    `- Ascendant in ${at(natal.ascendant)}; Midheaven in ${at(natal.midheaven)}`,
    reading.note === "ambiguous" ? "The birth time happened twice on that date (clocks went back); the earlier one was used." : "",
    reading.note === "skipped" ? "The birth time was skipped by a clock change on that date; it was moved forward by the gap." : "",
    `Natal aspects: ${natal.aspects.map((a) => `${pointName(a.a)} ${a.aspect} ${pointName(a.b)}${orb(a.orb)}`).join("; ") || "none"}`,
    `Transits now (closest first): ${transits.map((t) => `transiting ${pointName(t.planet)} ${t.aspect} natal ${pointName(t.natal)}${orb(t.orb)}, through your ${house(t.house)}`).join("; ") || "none within 2°"}`,
    `Meanings (Oracle's own wording):`,
    ...[...transitPlanets].map((planet) => `- ${astrologyCatalog.planets[planet].name}: ${astrologyCatalog.planets[planet].meaning}`),
    ...[...aspectNames].map((aspect) => `- ${astrologyCatalog.aspects[aspect].name}: ${astrologyCatalog.aspects[aspect].meaning}`),
    ...[...transitHouses].sort((a, b) => a - b).map((number) => `- ${astrologyCatalog.houses[String(number)]!.name}: ${astrologyCatalog.houses[String(number)]!.meaning}`),
  ].filter(Boolean).join("\n")
}
