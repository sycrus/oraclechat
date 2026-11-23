/** Procedural poses for the call stage. Angles are radians on VRM normalized bones (T-pose, facing +Z). */

export type Angles = { x: number; y: number; z: number }

/** These poses use VRM 1.0 axes. A VRM 0.x normalized bone is turned 180° about Y, which negates X and Z. */
export function orientFor(angles: Angles, vrm0: boolean): Angles {
  return vrm0 ? { x: -angles.x, y: angles.y, z: -angles.z } : angles
}

/** Upper arms rotate this far down from the T-pose at rest. */
export const ARM_DOWN = 1.2

/** Frame-rate independent easing toward a target (~300 ms to get most of the way). */
export function easeToward(current: number, target: number, dt: number, rate = 8): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}

const REST = {
  rightUpperArm: { x: 0, y: 0, z: ARM_DOWN },
  rightLowerArm: { x: 0, y: 0, z: 0 },
  rightHand: { x: 0, y: 0, z: 0 },
  head: { x: 0, y: 0, z: 0 },
}

/** Hand near the chin, head turned and tilted up, eyes up and away. Tuned by eye on the sample VRM. */
const THINKING = {
  rightUpperArm: { x: 0, y: 1.2, z: 0.9 },
  rightLowerArm: { x: 0, y: 2.5, z: 0 },
  rightHand: { x: 0.5, y: 0.2, z: -0.5 },
  head: { x: -0.15, y: 0.35, z: 0.1 },
}

const mix = (a: Angles, b: Angles, weight: number): Angles => ({
  x: a.x + (b.x - a.x) * weight,
  y: a.y + (b.y - a.y) * weight,
  z: a.z + (b.z - a.z) * weight,
})

export function thinkingPose(weight: number) {
  return {
    rightUpperArm: mix(REST.rightUpperArm, THINKING.rightUpperArm, weight),
    rightLowerArm: mix(REST.rightLowerArm, THINKING.rightLowerArm, weight),
    rightHand: mix(REST.rightHand, THINKING.rightHand, weight),
    head: mix(REST.head, THINKING.head, weight),
    lookUp: 0.5 * weight,
    lookAway: 0.5 * weight,
  }
}
