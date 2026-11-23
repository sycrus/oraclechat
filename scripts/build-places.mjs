// Builds backend/agent/data/places.json from GeoNames dumps (CC BY 4.0, https://www.geonames.org/).
// Download and unzip https://download.geonames.org/export/dump/{cities15000.zip,admin1CodesASCII.txt,countryInfo.txt}, then:
//   node scripts/build-places.mjs <cities15000.txt> <admin1CodesASCII.txt> <countryInfo.txt>
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const [citiesPath, admin1Path, countriesPath] = process.argv.slice(2)
if (!citiesPath || !admin1Path || !countriesPath) {
  console.error("usage: node scripts/build-places.mjs <cities15000.txt> <admin1CodesASCII.txt> <countryInfo.txt>")
  process.exit(1)
}

const rows = (path) => readFileSync(path, "utf8").split("\n").filter((line) => line && !line.startsWith("#")).map((line) => line.split("\t"))

const countries = new Map(rows(countriesPath).map((columns) => [columns[0], columns[4]]))
const regions = new Map(rows(admin1Path).map((columns) => [columns[0], columns[1]]))

// Row: [geonameId, name, asciiName ("" when the same as name), region, country, latitude, longitude, timeZone, population]
const round = (value) => Math.round(Number(value) * 1e4) / 1e4
const places = rows(citiesPath)
  .map((c) => [Number(c[0]), c[1], c[2] === c[1] ? "" : c[2], regions.get(`${c[8]}.${c[10]}`) ?? "", countries.get(c[8]) ?? c[8], round(c[4]), round(c[5]), c[17], Number(c[14])])
  .filter((place) => place[7] && Number.isFinite(place[5]) && Number.isFinite(place[6]))
  .sort((a, b) => b[8] - a[8])

const output = fileURLToPath(new URL("../backend/agent/data/places.json", import.meta.url))
writeFileSync(output, `[\n${places.map((place) => JSON.stringify(place)).join(",\n")}\n]\n`)
console.log(`Wrote ${places.length} places to ${output}`)
