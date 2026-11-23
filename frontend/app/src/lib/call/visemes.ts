/** Vowel lip sync: maps wLipSync's vowel weights (A I U E O, already smoothed) to the VRM mouth shapes. */

export const VISEMES = ["aa", "ih", "ou", "ee", "oh"] as const
export type Viseme = (typeof VISEMES)[number]

const VOWELS: Record<string, Viseme> = { A: "aa", I: "ih", U: "ou", E: "ee", O: "oh" }
const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function visemeWeights(weights: Record<string, number>, volume: number): Record<Viseme, number> {
  const result: Record<Viseme, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 }
  for (const [vowel, weight] of Object.entries(weights)) {
    const viseme = VOWELS[vowel]
    if (viseme) result[viseme] = clamp(weight * clamp(volume))
  }
  return result
}
