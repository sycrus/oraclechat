# places.json provenance

- **Source:** GeoNames (https://www.geonames.org/), `cities15000.zip` (cities with a population over 15,000), `admin1CodesASCII.txt` and `countryInfo.txt`.
- **Licence:** Creative Commons Attribution 4.0 (CC BY 4.0). The birth-place picker shows "Places © GeoNames, CC BY 4.0".
- **Downloaded:** 2026-11-23. GeoNames last modified `cities15000.zip` on 2026-11-22.
- **Transform:** `scripts/build-places.mjs`. Each row is `[geonameId, name, asciiName, region, country, latitude, longitude, timeZone, population]`. `asciiName` is `""` when it equals `name`, coordinates are rounded to 4 decimals, and rows are sorted by population, descending. No other edits.
- **Regenerate:** download the three files and run `node scripts/build-places.mjs <cities15000.txt> <admin1CodesASCII.txt> <countryInfo.txt>`.
