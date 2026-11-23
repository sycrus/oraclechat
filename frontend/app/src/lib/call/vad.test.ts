import { describe, expect, it } from "vitest"
import { createTurnDetector, type TurnEvent } from "./vad"

const RATE = 16000
const FRAME = 320 // 20 ms

const tone = (amplitude: number) => Float32Array.from({ length: FRAME }, (_, index) => amplitude * Math.sin(index / 3))
const speech = () => tone(0.2)
const quiet = () => new Float32Array(FRAME)
const noise = () => tone(0.014) // RMS ≈ 0.01

function run(frames: Array<[() => Float32Array, number]>) {
  const detector = createTurnDetector({ sampleRate: RATE })
  const events: TurnEvent[] = []
  for (const [make, ms] of frames) for (let at = 0; at < ms; at += 20) events.push(...detector.push(make()))
  return events
}

describe("turn detector", () => {
  it("does nothing in silence", () => {
    expect(run([[quiet, 3000]])).toEqual([])
  })

  it("discards a short click", () => {
    expect(run([[quiet, 500], [speech, 100], [quiet, 1500]]).map((event) => event.type)).toEqual(["discard"])
  })

  it("starts a turn after 0.3 s of speech and ends it after 0.8 s of silence", () => {
    const events = run([[quiet, 500], [speech, 1000], [quiet, 1000]])
    expect(events.map((event) => event.type)).toEqual(["speechStart", "turn"])
    const turn = events[1] as Extract<TurnEvent, { type: "turn" }>
    // 0.3 s pre-roll + 1 s of speech + 0.8 s of trailing silence
    expect(turn.samples.length / RATE).toBeCloseTo(2.1, 1)
  })

  it("does not end a turn on a short pause", () => {
    const events = run([[quiet, 200], [speech, 600], [quiet, 400], [speech, 600], [quiet, 1000]])
    expect(events.map((event) => event.type)).toEqual(["speechStart", "turn"])
  })

  it("cuts a turn at 20 seconds", () => {
    const events = run([[quiet, 200], [speech, 25000]])
    const turns = events.filter((event): event is Extract<TurnEvent, { type: "turn" }> => event.type === "turn")
    expect(turns[0]!.samples.length / RATE).toBeLessThanOrEqual(20)
    expect(turns[0]!.samples.length / RATE).toBeGreaterThan(19.5)
  })

  it("ignores steady background noise but still hears speech over it", () => {
    const events = run([[noise, 3000], [speech, 800], [noise, 1000]])
    expect(events.map((event) => event.type)).toEqual(["speechStart", "turn"])
  })

  it("forgets a turn in progress on reset", () => {
    const detector = createTurnDetector({ sampleRate: RATE })
    for (let at = 0; at < 600; at += 20) detector.push(speech())
    detector.reset()
    const events: TurnEvent[] = []
    for (let at = 0; at < 1500; at += 20) events.push(...detector.push(quiet()))
    expect(events).toEqual([])
  })
})
