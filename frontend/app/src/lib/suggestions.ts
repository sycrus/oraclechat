/** Suggested follow-up questions for a reading (chat spec: Suggested questions). Each is sent as an ordinary user message. */
import { shortName, type IChingReading } from "./iching"
import { PLANET_NAMES, pointName, signName, type AstrologyReading, type Planet } from "./astrology"

export function ichingSuggestions(reading: IChingReading): string[] {
  const changing = reading.lines.flatMap((line, index) => line.changing ? [index + 1] : [])
  const asked = changing.length
    ? [`What does line ${changing[changing.length - 1]} mean?`]
    : [`What does ${shortName(reading.primary.name)} ask of me?`]
  if (reading.relating) asked.push(`Why ${shortName(reading.relating.name)}?`)
  asked.push("How does this fit my question?")
  return asked.slice(0, 3)
}

export function chartSuggestions(reading: AstrologyReading, selected: Planet): string[] {
  const asked: string[] = []
  const placement = reading.natal.planets.find((planet) => planet.point === selected)
  if (placement) asked.push(`What does ${PLANET_NAMES[placement.point]} in ${signName(placement.sign)} mean?`)
  const transit = reading.transits[0]
  if (transit) asked.push(`What does ${PLANET_NAMES[transit.planet]} ${transit.aspect} my ${pointName(transit.natal)} mean?`)
  asked.push(`Why does my ${signName(reading.natal.ascendant.sign)} rising matter?`)
  return asked.slice(0, 3)
}
