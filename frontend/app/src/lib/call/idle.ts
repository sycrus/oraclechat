/** Procedural idle motion: breathing sway and irregular blinks. Times in seconds (breathing) or ms (blinks). */

const BLINK_MS = 150

export function nextBlinkDelay(random: () => number = Math.random): number {
  return 2000 + random() * 4000
}

/** Blink weight for the VRM "blink" expression, ms after the blink started. */
export function blinkWeight(sinceStart: number): number {
  if (sinceStart <= 0 || sinceStart >= BLINK_MS) return 0
  return Math.sin((sinceStart / BLINK_MS) * Math.PI)
}

/** Small bone rotations (radians) for chest and neck at time t. */
export function breathing(t: number): { chest: number; neck: number } {
  return {
    chest: Math.sin(t * 1.6) * 0.02,
    neck: Math.sin(t * 0.7 + 1) * 0.015 + Math.sin(t * 0.23) * 0.01,
  }
}
