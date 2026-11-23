export type MemoryKind = "core" | "detail"

export interface UserMemory {
  id: string
  content: string
  /** Null once chat history is cleared; the memory itself is kept. */
  sourceConversationId: string | null
  kind: MemoryKind
  entities: string[]
  createdAt: string
  updatedAt: string
}

/** Internal record: the embedding never leaves the memory service. */
export interface StoredMemory extends UserMemory {
  embedding: number[] | null
}

export interface NewMemory {
  content: string
  sourceConversationId: string
  kind: MemoryKind
  entities: string[]
  embedding: number[] | null
}

export interface MemoryPatch {
  content?: string
  kind?: MemoryKind
  entities?: string[]
  embedding?: number[] | null
}

export type MemoryOperation =
  | { op: "add"; content: string; kind: MemoryKind; entities: string[] }
  | { op: "update"; id: string; content: string; kind: MemoryKind; entities: string[] }

export interface MemoryStore {
  initialize(): Promise<void>
  hasConsent(): Promise<boolean>
  setConsent(consented: boolean): Promise<void>
  /** Whether saved memories may also go to a hosted model (ADR-0014). */
  hasHostedConsent(): Promise<boolean>
  setHostedConsent(consented: boolean): Promise<void>
  list(): Promise<StoredMemory[]>
  add(memory: NewMemory): Promise<StoredMemory>
  update(id: string, patch: MemoryPatch): Promise<StoredMemory | null>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  /** Unlink every memory from its source conversation so a bulk chat clear keeps it. */
  detachAllSources(): Promise<void>
}
