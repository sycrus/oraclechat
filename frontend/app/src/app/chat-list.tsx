import React from "react"
import { chatName, filterChats, previewLine, timeLabel, type ConversationSummary } from "../lib/chat-list"
import { ConversationAvatar } from "./avatar"
import { Icon } from "./icons"

type Teller = { id: string; name: string }

/** The Chats tab (chat spec: Chat list rows): wordmark, search, one row per conversation and the new-chat button. */
export function ChatList({ conversations, tellers, activeId, query, now, onQuery, onOpen, onNew }: {
  conversations: ConversationSummary[]
  tellers: Teller[]
  activeId?: string | undefined
  query: string
  now?: Date
  onQuery: (query: string) => void
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const shown = filterChats(conversations, query, tellers)
  return <div className="chat-list">
    <header className="list-header">
      <h1 className="wordmark">OracleChat</h1>
      <button type="button" className="icon-button" aria-label="New chat" onClick={onNew}><Icon name="newchat" /></button>
    </header>
    <label className="search px">
      <Icon name="search" />
      <input type="search" aria-label="Search chats" placeholder="Search" value={query} onChange={(event) => onQuery(event.target.value)} />
    </label>
    <ul className="rows">
      {shown.map((item) => {
        const time = item.lastMessage?.createdAt ?? item.updatedAt
        return <li key={item.id}>
          <button type="button" className="chat-row" aria-current={item.id === activeId ? "true" : undefined} onClick={() => onOpen(item.id)}>
            <ConversationAvatar tellerIds={item.tellerIds} />
            <span className="row-body">
              <span className="row-top"><span className="row-title">{chatName(item.tellerIds, tellers)}</span>{time && <span className="row-time">{timeLabel(time, now)}</span>}</span>
              <span className="row-preview">{previewLine(item, tellers) || "No messages yet"}</span>
            </span>
          </button>
        </li>
      })}
    </ul>
    {conversations.length === 0 && <p className="list-empty">No chats yet. Start one with the new chat button.</p>}
    {conversations.length > 0 && shown.length === 0 && <p className="list-empty">No chats match “{query}”.</p>}
    <button type="button" className="fab px" aria-label="New chat" onClick={onNew}><Icon name="newchat" size={32} /></button>
  </div>
}

