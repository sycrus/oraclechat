/** Place search and the birth profile (birth-details spec). Responses go only to the owner's browser, never to logs or spans. */
import type { Express } from "express"
import { BirthDetailsError, parseBirthDetails } from "./details.js"
import { getPlace, searchPlaces } from "./places.js"
import type { BirthProfileStore } from "./profile-store.js"

export function registerBirthDetailsRoutes(app: Express, store: BirthProfileStore): void {
  app.get("/api/places", (request, response) => {
    response.json({ places: searchPlaces(typeof request.query.q === "string" ? request.query.q : "") })
  })
  app.get("/api/birth-details", async (_request, response, next) => {
    try {
      const profile = await store.get()
      response.json({ profile: profile ? { date: profile.date, time: profile.time, place: getPlace(profile.placeId) ?? null } : null })
    } catch (error) { next(error) }
  })
  app.put("/api/birth-details", async (request, response, next) => {
    try {
      const profile = parseBirthDetails(request.body)
      await store.save(profile)
      response.json({ profile: { date: profile.date, time: profile.time, place: getPlace(profile.placeId) } })
    } catch (error) {
      if (error instanceof BirthDetailsError) { response.status(400).json({ error: error.message }); return }
      next(error)
    }
  })
  app.delete("/api/birth-details", async (_request, response, next) => {
    try { await store.delete(); response.status(204).end() } catch (error) { next(error) }
  })
}
