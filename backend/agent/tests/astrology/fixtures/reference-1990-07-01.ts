/**
 * Reference positions for 1990-07-01 16:00 UT (12:00 EDT in New York), from NASA JPL Horizons
 * (https://ssd.jpl.nasa.gov/api/horizons.api), observer ephemeris, geocentric (500@399),
 * QUANTITIES=31 (observer ecliptic longitude of date), queried 2026-11-23.
 * Retrograde flags compare Horizons longitudes at 1990-07-01 04:00 and 1990-07-02 04:00 UT.
 */
export const reference = {
  birth: { date: "1990-07-01", time: "12:00", place: { latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" } },
  utc: "1990-07-01T16:00:00.000Z",
  longitudes: {
    sun: 99.5583516,
    moon: 208.9968633,
    mercury: 98.2635436,
    venus: 67.8964499,
    mars: 22.4887016,
    jupiter: 109.451113,
    saturn: 292.9735442,
    uranus: 277.5168894,
    neptune: 283.2934055,
    pluto: 225.1309392,
  },
  retrograde: ["saturn", "uranus", "neptune", "pluto"],
} as const
