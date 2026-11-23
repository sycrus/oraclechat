/** Loudness lip sync: maps the playing audio's RMS level to the VRM "aa" mouth weight (0..1). */

const NOISE_FLOOR = 0.02
const GAIN = 4
const OPEN_RATE = 0.6
const CLOSE_RATE = 0.25

export function mouthOpen(rms: number, previous: number): number {
  const target = rms <= NOISE_FLOOR ? 0 : Math.min(1, (rms - NOISE_FLOOR) * GAIN)
  const rate = target > previous ? OPEN_RATE : CLOSE_RATE
  const value = previous + (target - previous) * rate
  return value < 0.01 ? 0 : Math.min(1, value)
}

/** RMS of time-domain samples from an AnalyserNode (values in -1..1). */
export function rms(samples: Float32Array): number {
  let sum = 0
  for (const sample of samples) sum += sample * sample
  return samples.length ? Math.sqrt(sum / samples.length) : 0
}
