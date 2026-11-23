/**
 * The 16-colour call palette (voice-calls spec: Pixel-filtered teller render): the interface palette plus
 * skin, hair and clothing tones. `nearestColour` is the reference the call's quantize shader matches.
 */
export const CALL_PALETTE = [
  "#0b1028", "#121a3d", "#1c2752", "#2a3768", "#2d4a8c", "#8c93b0", "#d4d8e4", "#f0f2f8", "#e8c35a",
  "#f0c9a6", "#c98e66", "#7a4e3c", "#4a3366", "#6b55b0", "#b4434a", "#3f7a6a",
] as const

export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** The palette colour at the smallest squared distance in sRGB. */
export function nearestColour(rgb: Rgb): (typeof CALL_PALETTE)[number] {
  let best: (typeof CALL_PALETTE)[number] = CALL_PALETTE[0]
  let bestDistance = Infinity
  for (const colour of CALL_PALETTE) {
    const [r, g, b] = hexToRgb(colour)
    const distance = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2
    if (distance < bestDistance) { best = colour; bestDistance = distance }
  }
  return best
}

// Nearest colour for each 5-bit-per-channel bucket, filled lazily: per-frame snapping without 16 distance checks a pixel.
const lut = new Int16Array(32 * 32 * 32).fill(-1)
const rgbs = CALL_PALETTE.map(hexToRgb)

/**
 * Snaps a WebGL frame (`readPixels` RGBA, bottom row first) into canvas ImageData (top row first). Pixels under half
 * opacity stay transparent so the call backdrop shows through.
 */
export function snapFrame(source: Uint8Array, width: number, height: number, target: Uint8ClampedArray): void {
  for (let y = 0; y < height; y++) {
    const from = (height - 1 - y) * width * 4
    const to = y * width * 4
    for (let x = 0; x < width * 4; x += 4) {
      const alpha = source[from + x + 3]!
      if (alpha < 128) { target[to + x + 3] = 0; continue }
      const r = source[from + x]!, g = source[from + x + 1]!, b = source[from + x + 2]!
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      let index = lut[key]!
      if (index < 0) { index = CALL_PALETTE.indexOf(nearestColour([(r & 248) + 4, (g & 248) + 4, (b & 248) + 4])); lut[key] = index }
      const colour = rgbs[index]!
      target[to + x] = colour[0]; target[to + x + 1] = colour[1]; target[to + x + 2] = colour[2]; target[to + x + 3] = 255
    }
  }
}
