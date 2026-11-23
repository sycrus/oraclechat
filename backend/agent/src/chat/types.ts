export type ChatSenderType = "user" | "teller"

/** A teller's own web search: the query it chose and what came back. */
export interface TellerLookup {
  query: string
  results: import("../search/brave.js").SearchResult[]
  error?: string
}

/** A link from the user's message: its title when it was read, or an error when it couldn't be. */
export interface LinkRef {
  url: string
  title?: string
  error?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderType: ChatSenderType
  senderId: string
  content: string
  createdAt: string
  reading?: import("../tarot/draw.js").TarotSpread | import("../iching/cast.js").IChingReading | import("../astrology/chart.js").AstrologyReading
  signatureCard?: import("../tarot/draw.js").TarotCardDraw
  /** A teller's lookup; older user messages may hold a plain result list from user-triggered search. */
  search?: TellerLookup | import("../search/brave.js").SearchResult[]
  links?: LinkRef[]
  /** Interactive message state (ADR-0017). Server-side: may hold hidden cards; send it out only through publicInteraction. */
  interaction?: import("./interaction.js").Interaction
}

/** A message as the browser sees it: interaction state without its hidden cards (see publicMessage). */
export type PublicChatMessage = Omit<ChatMessage, "interaction"> & { interaction?: import("./interaction.js").PublicInteraction }

export interface ConversationSummary {
  id: string
  title: string
  tellerIds: string[]
  createdAt: string
  updatedAt: string
  /** The newest message, for the chat list; absent while the conversation is empty. */
  lastMessage?: LastMessage
}

export interface LastMessage {
  senderType: ChatSenderType
  senderId: string
  preview: string
  createdAt: string
}

export interface ChatConversation extends Omit<ConversationSummary, "lastMessage"> {
  messages: ChatMessage[]
}

export type PublicChatConversation = Omit<ChatConversation, "messages"> & { messages: PublicChatMessage[] }

export interface CreateConversationInput {
  id: string
  title: string
  tellerIds: string[]
}

export interface AppendMessageInput {
  id: string
  conversationId: string
  senderType: ChatSenderType
  senderId: string
  content: string
  reading?: import("../tarot/draw.js").TarotSpread | import("../iching/cast.js").IChingReading | import("../astrology/chart.js").AstrologyReading
  signatureCard?: import("../tarot/draw.js").TarotCardDraw
  /** A teller's lookup; older user messages may hold a plain result list from user-triggered search. */
  search?: TellerLookup | import("../search/brave.js").SearchResult[]
  links?: LinkRef[]
  interaction?: import("./interaction.js").Interaction
}

export interface ChatStore {
  initialize(): Promise<void>
  createConversation(input: CreateConversationInput): Promise<ChatConversation>
  listConversations(): Promise<ConversationSummary[]>
  getConversation(id: string): Promise<ChatConversation | null>
  appendMessage(input: AppendMessageInput): Promise<ChatMessage>
  /** Replaces a message's interaction only if its state is still `expectedState`; returns whether it did. */
  updateInteraction(messageId: string, expectedState: string, next: import("./interaction.js").Interaction, reading?: { reading: ChatMessage["reading"]; signatureCard?: ChatMessage["signatureCard"] }): Promise<boolean>
  deleteConversation(id: string): Promise<void>
  deleteAllConversations(): Promise<void>
  renameConversation(id: string, title: string): Promise<void>
  close(): Promise<void>
}
