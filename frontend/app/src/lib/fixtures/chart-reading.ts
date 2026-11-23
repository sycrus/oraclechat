/** A valid natal-and-transits reading for tests. */
import { parseAstrologyReading, type AstrologyReading } from "../astrology"

const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const
export const chartReading: AstrologyReading = parseAstrologyReading({
  method: "natal-transits",
  computedAt: "2026-11-23T12:00:00.000Z",
  natal: {
    planets: PLANETS.map((point, index) => ({ point, longitude: index * 33 + 12.5, sign: SIGNS[Math.floor((index * 33 + 12.5) / 30)], degree: (index * 33 + 12.5) % 30, house: (index % 12) + 1, retrograde: point === "saturn" })),
    ascendant: { longitude: 176.38, sign: "virgo", degree: 26.38 },
    midheaven: { longitude: 85.82, sign: "gemini", degree: 25.82 },
    aspects: [{ a: "sun", b: "mercury", aspect: "conjunction", orb: 1.3 }],
  },
  transits: [
    { planet: "saturn", aspect: "square", natal: "moon", orb: 0.4, house: 7 },
    { planet: "jupiter", aspect: "trine", natal: "sun", orb: 1.1, house: 3 },
    { planet: "mars", aspect: "opposition", natal: "venus", orb: 1.8, house: 9 },
  ],
})!
