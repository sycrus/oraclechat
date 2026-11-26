import express, { type Express } from "express"
import { ChatService, type ChatEvent } from "../chat/service.js"
import { InteractionError } from "../chat/interaction.js"
import { registerSpeechRoutes, type SpeechRouteOptions } from "../speech/routes.js"
import { registerBirthDetailsRoutes } from "../astrology/routes.js"
import type { BirthProfileStore } from "../astrology/profile-store.js"

export function createApp(chatService?: ChatService, options: { speech?: SpeechRouteOptions; birthProfiles?: BirthProfileStore } = {}): Express {
  const app = express()
  app.use(express.json())

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" })
  })

  if (options.speech) registerSpeechRoutes(app, options.speech)
  if (options.birthProfiles) registerBirthDetailsRoutes(app, options.birthProfiles)

  if (chatService) {
    app.get("/api/conversations", async (_request, response, next) => {
      try { response.json(await chatService.listConversations()) } catch (error) { next(error) }
    })
    app.post("/api/conversations", async (request, response, next) => {
      try {
        const tellerIds = request.body?.tellerIds
        if (!Array.isArray(tellerIds) || tellerIds.some((id: unknown) => typeof id !== "string")) {
          response.status(400).json({ error: "tellerIds must be an array of teller IDs" }); return
        }
        response.status(201).json(await chatService.createConversation(tellerIds))
      } catch (error) { next(error) }
    })
    app.get("/api/conversations/:id", async (request, response, next) => {
      try {
        const conversation = await chatService.getConversation(request.params.id!)
        if (!conversation) { response.status(404).json({ error: "Conversation not found" }); return }
        response.json(conversation)
      } catch (error) { next(error) }
    })
    app.delete("/api/conversations", async (_request, response, next) => {
      try { await chatService.clearConversations(); response.status(204).end() } catch (error) { next(error) }
    })
    app.delete("/api/conversations/:id", async (request, response, next) => {
      try { await chatService.deleteConversation(request.params.id!); response.status(204).end() } catch (error) { next(error) }
    })
    app.post("/api/conversations/:id/messages", async (request, response, next) => {
      const content = request.body?.content
      if (typeof content !== "string" || !content.trim()) { response.status(400).json({ error: "content is required" }); return }
      // Readings and lookups are decided per turn by the tellers' routing (ADR-0012), never by the composer.
      if (request.body?.spread !== undefined || request.body?.search !== undefined) {
        response.status(400).json({ error: "readings and lookups are chosen by the tellers" }); return
      }
      const call = request.body?.call
      if (call !== undefined && typeof call !== "boolean") { response.status(400).json({ error: "call must be a boolean" }); return }
      if (call) {
        try { await chatService.assertCallable(request.params.id!) } catch (error) {
          response.status(400).json({ error: error instanceof Error ? error.message : "Calls are not available" }); return
        }
      }
      response.status(200)
      response.setHeader("Content-Type", "text/event-stream")
      response.setHeader("Cache-Control", "no-cache, no-transform")
      response.setHeader("Connection", "keep-alive")
      response.flushHeaders()
      try {
        await chatService.sendMessage(request.params.id!, content, (event) => response.write(`data: ${JSON.stringify(event)}\n\n`), { call: call === true })
        response.end()
      } catch (error) {
        response.write(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Chat failed" })}\n\n`)
        response.end()
      }
    })
    // Interactions with interactive messages (ADR-0017). Picks answer with JSON; a reveal streams the teller's
    // interpretation as SSE. The stream starts only with the first event, so rejections are still plain statuses.
    app.post("/api/conversations/:id/messages/:messageId/interactions", async (request, response, next) => {
      let streaming = false
      const emit = (event: ChatEvent) => {
        if (!streaming) {
          streaming = true
          response.status(200)
          response.setHeader("Content-Type", "text/event-stream")
          response.setHeader("Cache-Control", "no-cache, no-transform")
          response.setHeader("Connection", "keep-alive")
          response.flushHeaders()
        }
        response.write(`data: ${JSON.stringify(event)}\n\n`)
      }
      try {
        const message = await chatService.interact(request.params.id!, request.params.messageId!, request.body, emit)
        if (streaming) response.end()
        else response.status(200).json({ message })
      } catch (error) {
        if (!streaming) {
          if (error instanceof InteractionError) { response.status(error.status).json({ error: error.message }); return }
          next(error); return
        }
        response.write(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Interaction failed" })}\n\n`)
        response.end()
      }
    })
    app.get("/api/memory", async (_request, response, next) => {
      try {
        response.json({
          consented: await chatService.memoryConsent(),
          hostedConsented: await chatService.hostedMemoryConsent(),
          hostedReplies: chatService.replySettings().hostedReplies,
          guardrails: chatService.replySettings().guardrails,
          memories: await chatService.listMemories(),
        })
      } catch (error) { next(error) }
    })
    app.put("/api/memory/consent", async (request, response, next) => {
      try {
        if (typeof request.body?.consented !== "boolean") { response.status(400).json({ error: "consented must be a boolean" }); return }
        await chatService.setMemoryConsent(request.body.consented)
        response.json({ consented: await chatService.memoryConsent() })
      } catch (error) { next(error) }
    })
    app.put("/api/memory/hosted-consent", async (request, response, next) => {
      try {
        const consented = request.body?.consented
        if (typeof consented !== "boolean") { response.status(400).json({ error: "consented must be a boolean" }); return }
        if (!chatService.replySettings().hostedReplies) { response.status(400).json({ error: "hosted replies are not configured" }); return }
        if (consented && !await chatService.memoryConsent()) { response.status(400).json({ error: "memory must be on first" }); return }
        await chatService.setHostedMemoryConsent(consented)
        response.json({ hostedConsented: await chatService.hostedMemoryConsent() })
      } catch (error) { next(error) }
    })
    app.patch("/api/memory/:id", async (request, response, next) => {
      try {
        const content = request.body?.content
        const kind = request.body?.kind
        if ((content !== undefined && typeof content !== "string") || (kind !== undefined && kind !== "core" && kind !== "detail")
            || (content === undefined && kind === undefined)) {
          response.status(400).json({ error: "content (string) and/or kind (core or detail) is required" }); return
        }
        response.json(await chatService.editMemory(request.params.id!, { ...(content !== undefined ? { content } : {}), ...(kind ? { kind } : {}) }))
      } catch (error) { next(error) }
    })
    app.delete("/api/memory/:id", async (request, response, next) => {
      try { await chatService.deleteMemory(request.params.id!); response.status(204).end() } catch (error) { next(error) }
    })
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    response.status(400).json({ error: error instanceof Error ? error.message : "Request failed" })
  })

  return app
}
