import { describe, expect, it } from "vitest"
import { downsample, encodeWav } from "./wav"

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const ascii = (bytes: Uint8Array, start: number) => String.fromCharCode(...bytes.slice(start, start + 4))

describe("encodeWav", () => {
  it("writes a 16-bit mono PCM header", () => {
    const wav = encodeWav(new Float32Array(1600), 16000)
    const data = view(wav)
    expect(wav.length).toBe(44 + 3200)
    expect([ascii(wav, 0), ascii(wav, 8), ascii(wav, 12), ascii(wav, 36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"])
    expect(data.getUint32(4, true)).toBe(36 + 3200)
    expect(data.getUint16(20, true)).toBe(1) // PCM
    expect(data.getUint16(22, true)).toBe(1) // mono
    expect(data.getUint32(24, true)).toBe(16000)
    expect(data.getUint32(28, true)).toBe(32000)
    expect(data.getUint16(34, true)).toBe(16)
    expect(data.getUint32(40, true)).toBe(3200)
  })

  it("scales samples to 16-bit and clips outside -1..1", () => {
    const data = view(encodeWav(new Float32Array([0, 0.5, -0.5, 2, -2]), 16000))
    expect([0, 1, 2, 3, 4].map((index) => data.getInt16(44 + index * 2, true))).toEqual([0, 16383, -16384, 32767, -32768])
  })
})

describe("downsample", () => {
  it("averages blocks down to the target rate", () => {
    const input = new Float32Array([0, 0.3, 0.6, 0.3, 0.3, 0.3])
    const output = downsample(input, 48000, 16000)
    expect(output).toHaveLength(2)
    expect(output[0]).toBeCloseTo(0.3)
    expect(output[1]).toBeCloseTo(0.3)
  })

  it("keeps the duration for rates that do not divide evenly", () => {
    expect(downsample(new Float32Array(44100), 44100, 16000)).toHaveLength(16000)
  })

  it("returns the input when the rate already matches", () => {
    const input = new Float32Array([0.1, 0.2])
    expect(downsample(input, 16000, 16000)).toBe(input)
  })
})
