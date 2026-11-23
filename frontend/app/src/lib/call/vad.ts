/**
 * Energy-based turn detection for the open mic (ADR-0016). Frames are compared with an adaptive
 * noise floor (calibrated on the first frame, falling at once and rising slowly while quiet); a turn needs
 * 0.3 s of speech, ends after 0.8 s of silence and is cut at 20 s.
 */

export type TurnEvent =
  | { type: "speechStart" }
  | { type: "turn"; samples: Float32Array }
  | { type: "discard" }

export interface TurnDetector {
  push(frame: Float32Array): TurnEvent[]
  reset(): void
}

const MIN_SPEECH_MS = 300
const MAX_GAP_MS = 100 // a pause longer than this before speech is confirmed discards the burst
const END_SILENCE_MS = 800
const MAX_TURN_MS = 20_000
const PRE_ROLL_MS = 300
const MIN_THRESHOLD = 0.008
const FLOOR_RATIO = 3
const FLOOR_RISE = 0.01

const rmsOf = (frame: Float32Array) => {
  let sum = 0
  for (const sample of frame) sum += sample * sample
  return frame.length ? Math.sqrt(sum / frame.length) : 0
}

export function createTurnDetector({ sampleRate }: { sampleRate: number }): TurnDetector {
  let floor: number | null = null
  let phase: "quiet" | "candidate" | "turn" = "quiet"
  let preRoll: Float32Array[] = []
  let frames: Float32Array[] = []
  let speechMs = 0, gapMs = 0, silenceMs = 0, turnMs = 0

  const msOf = (frame: Float32Array) => (frame.length / sampleRate) * 1000
  const join = (parts: Float32Array[]) => {
    const out = new Float32Array(parts.reduce((total, part) => total + part.length, 0))
    let at = 0
    for (const part of parts) { out.set(part, at); at += part.length }
    return out
  }
  const toQuiet = () => { phase = "quiet"; frames = []; speechMs = gapMs = silenceMs = turnMs = 0 }
  const keepPreRoll = (frame: Float32Array) => {
    preRoll.push(frame)
    let total = preRoll.reduce((sum, part) => sum + msOf(part), 0)
    while (preRoll.length && total - msOf(preRoll[0]!) >= PRE_ROLL_MS) total -= msOf(preRoll.shift()!)
  }

  return {
    push(frame) {
      const level = rmsOf(frame)
      const ms = msOf(frame)
      if (floor === null) floor = level
      const loud = level > Math.max(floor * FLOOR_RATIO, MIN_THRESHOLD)

      if (phase === "quiet") {
        if (!loud) {
          floor = level < floor ? level : floor + (level - floor) * FLOOR_RISE
          keepPreRoll(frame)
          return []
        }
        phase = "candidate"
        frames = [...preRoll, frame]
        preRoll = []
        speechMs = ms
        gapMs = 0
        return []
      }

      frames.push(frame)
      if (phase === "candidate") {
        if (loud) { speechMs += ms; gapMs = 0 } else gapMs += ms
        if (gapMs > MAX_GAP_MS) { toQuiet(); return [{ type: "discard" }] }
        if (speechMs < MIN_SPEECH_MS) return []
        phase = "turn"
        turnMs = frames.reduce((sum, part) => sum + msOf(part), 0)
        return [{ type: "speechStart" }]
      }

      turnMs += ms
      silenceMs = loud ? 0 : silenceMs + ms
      if (silenceMs < END_SILENCE_MS && turnMs < MAX_TURN_MS) return []
      const samples = join(frames).subarray(0, Math.floor((MAX_TURN_MS / 1000) * sampleRate))
      toQuiet()
      return [{ type: "turn", samples }]
    },
    reset() {
      toQuiet()
      preRoll = []
    },
  }
}
