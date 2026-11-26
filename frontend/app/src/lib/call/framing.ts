/** Head-and-shoulders framing for the call camera, measured from the model's head rather than fixed offsets. */

/** The head as posed when the call opens, in world metres: highest head vertex, head bone height, width, horizontal centre and depth. */
export interface HeadBounds { readonly top: number; readonly base: number; readonly width: number; readonly centerX: number; readonly centerZ: number }

/** Camera at (x, y, centerZ + distance), looking straight at (x, y, centerZ). */
export interface Framing { readonly x: number; readonly y: number; readonly distance: number; readonly centerZ: number }

/** Visible height in head heights: 3 reproduces the old fixed view on a VRoid human. */
const HEADS_VISIBLE = 3
/** Headroom above the head top, in head heights. */
const HEADROOM = 0.1
/** Horizontal room around the head, as a multiple of its width: tight, so a phone-shaped window stays on the head and shoulders. */
const WIDTH_ROOM = 1.1

/** Frames the head in the upper part of the view, or null when it has no height (use the head bone instead). */
export function frameHead(head: HeadBounds, fovDeg: number, aspect: number): Framing | null {
  const size = head.top - head.base
  if (!(size > 0)) return null
  const visible = Math.max(HEADS_VISIBLE * size, (head.width * WIDTH_ROOM) / aspect)
  const y = head.top + HEADROOM * size - visible / 2
  const distance = visible / 2 / Math.tan((fovDeg * Math.PI) / 360)
  return { x: head.centerX, y, distance, centerZ: head.centerZ }
}

/** Whether a skinned vertex moves with the head: its strongest bone weight (first on ties) is a head bone. */
export function isHeadVertex(bones: ArrayLike<number>, weights: ArrayLike<number>, headBones: ReadonlySet<number>): boolean {
  let best = -1, bestWeight = 0
  for (let k = 0; k < weights.length; k++) {
    const weight = weights[k] ?? 0
    if (weight > bestWeight) { bestWeight = weight; best = bones[k] ?? -1 }
  }
  return bestWeight > 0 && headBones.has(best)
}
