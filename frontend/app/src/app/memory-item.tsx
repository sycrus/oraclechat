import React from "react"

export type MemoryKind = "core" | "detail"
export type Memory = { id: string; content: string; kind: MemoryKind; entities: string[] }

const tellerNames: Record<string, string> = { "mira-the-mystic": "Mira", "sage-the-seer": "Sage" }

export function nextKind(kind: MemoryKind): MemoryKind {
  return kind === "core" ? "detail" : "core"
}

export function MemoryItem({ memory, onPin, onEdit, onDelete }: {
  memory: Memory
  onPin: (memory: Memory) => void
  onEdit: (memory: Memory) => void
  onDelete: (id: string) => void
}) {
  const pinned = memory.kind === "core"
  return <div className={`saved-memory ${pinned ? "pinned" : ""}`}>
    <span className="memory-body">
      <span>{memory.content}</span>
      {memory.entities.length > 0 && <span className="memory-tags">{memory.entities.map((entity) => <span key={entity} className="memory-tag">{tellerNames[entity] ?? entity}</span>)}</span>}
    </span>
    <button aria-pressed={pinned} title={pinned ? "Always remembered in every reading" : "Remember this in every reading"} onClick={() => onPin(memory)}>{pinned ? "Unpin" : "Pin"}</button>
    <button onClick={() => onEdit(memory)}>Edit</button>
    <button onClick={() => onDelete(memory.id)}>Delete</button>
  </div>
}
