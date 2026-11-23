/** A call is offered only in a one-to-one chat with a teller that has a 3D model. */
export function callableTeller<T extends { id: string; model?: string }>(tellerIds: string[], tellers: T[]): (T & { model: string }) | undefined {
  if (tellerIds.length !== 1) return undefined
  const teller = tellers.find(({ id }) => id === tellerIds[0])
  return teller?.model ? teller as T & { model: string } : undefined
}
