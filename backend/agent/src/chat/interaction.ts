/** The one place hidden interaction state is removed before anything leaves the server (ADR-0017). */
import type { FanInteraction, PublicFan } from "../tarot/fan.js"
import type { PublicToss, TossInteraction } from "../iching/toss.js"
import type { BirthFormInteraction } from "../astrology/birth-form.js"
import type { ChatConversation, ChatMessage, PublicChatConversation, PublicChatMessage } from "./types.js"

/** Server-side interaction state of a message: the card fan, the coin toss and the birth-details form. */
export type Interaction = FanInteraction | TossInteraction | BirthFormInteraction
export type PublicInteraction = PublicFan | PublicToss | BirthFormInteraction

/** The browser's view of an interaction: no hidden cards or unthrown throws, ever. */
export function publicInteraction(interaction: Interaction | undefined): PublicInteraction | undefined {
  if (!interaction) return undefined
  if (interaction.kind === "birth-details") return interaction
  if (interaction.kind === "coin-toss") {
    const { remaining: _remaining, ...visible } = interaction
    return visible
  }
  const { hidden: _hidden, ...visible } = interaction
  return visible
}

/** A message safe to send to the browser. */
export function publicMessage(message: ChatMessage): PublicChatMessage {
  const { interaction, ...rest } = message
  const visible = publicInteraction(interaction)
  return visible ? { ...rest, interaction: visible } : rest
}

/** A conversation safe to send to the browser. */
export function publicConversation(conversation: ChatConversation): PublicChatConversation {
  return { ...conversation, messages: conversation.messages.map(publicMessage) }
}

/** A rejected interaction: 400 for a malformed request, 404 for an unknown message, 409 when the state doesn't allow it. */
export class InteractionError extends Error {
  constructor(readonly status: 400 | 404 | 409, message: string) { super(message) }
}

export type InteractionRequest = ({ action: "pick" | "unpick"; index: number } | { action: "reveal" } | { action: "toss"; after: number }
  /** The details are validated where they are saved (astrology/details.ts) and never stored on the message. */
  | { action: "submit"; details: unknown })
  /** Sent from a call (ADR-0020): the interpretation is spoken. */
  & { call?: boolean }

/** Validates an interaction request body. */
export function parseInteractionRequest(request: unknown): InteractionRequest {
  const body = (typeof request === "object" && request !== null ? request : {}) as { action?: unknown; index?: unknown; after?: unknown; details?: unknown; call?: unknown }
  if (body.call !== undefined && typeof body.call !== "boolean") throw new InteractionError(400, "call must be a boolean")
  const call = body.call === true ? { call: true } : {}
  if (body.action === "reveal") return { action: "reveal", ...call }
  if (body.action === "submit") return { action: "submit", details: body.details, ...call }
  if (body.action === "toss") {
    if (typeof body.after !== "number" || !Number.isInteger(body.after) || body.after < 0) throw new InteractionError(400, "after must be a non-negative integer")
    return { action: "toss", after: body.after, ...call }
  }
  if (body.action === "pick" || body.action === "unpick") {
    if (typeof body.index !== "number" || !Number.isInteger(body.index) || body.index < 0) throw new InteractionError(400, "index must be a non-negative integer")
    return { action: body.action, index: body.index, ...call }
  }
  throw new InteractionError(400, "action must be pick, unpick, reveal, toss or submit")
}
