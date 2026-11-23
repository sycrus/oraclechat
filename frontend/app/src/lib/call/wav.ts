/** Spoken turns as 16 kHz mono 16-bit WAV for local transcription (ADR-0016). */

export function downsample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples
  const length = Math.round((samples.length * to) / from)
  const output = new Float32Array(length)
  const ratio = from / to
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((index + 1) * ratio)))
    let sum = 0
    for (let at = start; at < end; at += 1) sum += samples[at]!
    output[index] = sum / (end - start)
  }
  return output
}

export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const text = (offset: number, value: string) => { for (let index = 0; index < 4; index += 1) bytes[offset + index] = value.charCodeAt(index) }
  text(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); text(8, "WAVE")
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, "data"); view.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample))
    view.setInt16(44 + index * 2, clipped < 0 ? clipped * 32768 : clipped * 32767, true)
  })
  return bytes
}
