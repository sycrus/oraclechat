/**
 * The call's pixel filter (voice-calls spec: Pixel-filtered teller render). The scene renders the normal way, at low
 * resolution, on a hidden WebGL canvas; each frame is read back, snapped to the 16-colour call palette by
 * `snapFrame`, and drawn on the visible canvas, which CSS scales up without smoothing (`image-rendering: pixelated`).
 * Rendering the scene untouched keeps every model's materials as they look unfiltered; GPU post-passes lost some
 * models' textures.
 */
import { snapFrame } from "../../lib/call/palette"

/** CSS pixels per rendered pixel: about 160 pixels across a phone-width call. */
export const BLOCK_PX = 2.5

export interface PixelOutput {
  /** The canvas WebGL should render into; hidden. */
  readonly source: HTMLCanvasElement
  setSize(width: number, height: number): void
  /** Copies the frame just rendered into the visible canvas, palette-snapped. */
  present(gl: WebGLRenderingContext | WebGL2RenderingContext): void
}

/** Returns null when the visible canvas can't take a 2D context; the stage then renders into it directly. */
export function createPixelOutput(visible: HTMLCanvasElement): PixelOutput | null {
  const context = visible.getContext("2d")
  if (!context) return null
  const source = document.createElement("canvas")
  let frame = new Uint8Array(4)
  let image = context.createImageData(1, 1)
  return {
    source,
    setSize(width, height) {
      visible.width = width
      visible.height = height
      frame = new Uint8Array(width * height * 4)
      image = context.createImageData(width, height)
    },
    present(gl) {
      gl.readPixels(0, 0, image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE, frame)
      snapFrame(frame, image.width, image.height, image.data)
      context.putImageData(image, 0, 0)
    },
  }
}
